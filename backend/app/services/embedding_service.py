from typing import List, Dict, Optional
import httpx
from openai import OpenAI

from app.core.config import settings


class EmbeddingService:
    """Embedding and reranking service using NVIDIA models"""
    
    def __init__(self):
        self.client: Optional[OpenAI] = None
        if settings.NVIDIA_API_KEY:
            self.client = OpenAI(
                api_key=settings.NVIDIA_API_KEY,
                base_url=settings.NVIDIA_BASE_URL
            )
        self.embed_model = "nvidia/nv-embed-v1"
        self.rerank_url = "https://ai.api.nvidia.com/v1/retrieval/nvidia/reranking"
        self.rerank_model = "nv-rerank-qa-mistral-4b:1"
    
    async def generate_embeddings(
        self,
        texts: List[str],
        input_type: str = "query",
        truncate: str = "NONE"
    ) -> List[List[float]]:
        """
        Generate embeddings using NVIDIA NV-Embed-v1 model.
        
        Args:
            texts: List of text strings to embed
            input_type: Type of input - "query" or "passage"
            truncate: Truncation strategy - "NONE", "START", or "END"
            
        Returns:
            List of embedding vectors (4096 dimensions each)
        """
        if not self.client:
            raise RuntimeError("NVIDIA_API_KEY is not configured")

        try:
            response = self.client.embeddings.create(
                input=texts,
                model=self.embed_model,
                encoding_format="float",
                extra_body={
                    "input_type": input_type,
                    "truncate": truncate
                }
            )
            
            return [item.embedding for item in response.data]
            
        except Exception as e:
            print(f"Embedding generation error: {e}")
            raise
    
    async def generate_query_embedding(self, query: str) -> List[float]:
        """
        Generate embedding for a search query.
        
        Args:
            query: Search query text
            
        Returns:
            Embedding vector (4096 dimensions)
        """
        embeddings = await self.generate_embeddings([query], input_type="query")
        return embeddings[0]
    
    async def generate_passage_embeddings(
        self,
        passages: List[str]
    ) -> List[List[float]]:
        """
        Generate embeddings for document passages.
        
        Args:
            passages: List of document passages
            
        Returns:
            List of embedding vectors
        """
        return await self.generate_embeddings(passages, input_type="passage")
    
    async def rerank_passages(
        self,
        query: str,
        passages: List[str],
        top_k: Optional[int] = None
    ) -> List[Dict[str, any]]:
        """
        Rerank passages using NVIDIA Retrieval QA Ranking Model.
        
        Args:
            query: Question or search query
            passages: List of candidate passages to rerank
            top_k: Optional number of top results to return
            
        Returns:
            List of dicts with 'index', 'text', and 'score' sorted by relevance
        """
        if not settings.NVIDIA_API_KEY:
            return [
                {"index": i, "text": passage, "score": 0.0}
                for i, passage in enumerate(passages[: top_k or len(passages)])
            ]

        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
                    "Accept": "application/json",
                }
                
                payload = {
                    "model": self.rerank_model,
                    "query": {"text": query},
                    "passages": [{"text": passage} for passage in passages]
                }
                
                response = await client.post(
                    self.rerank_url,
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()
                result = response.json()
                
                # Extract rankings
                rankings = result.get("rankings", [])
                
                # Sort by score (descending)
                sorted_rankings = sorted(
                    rankings,
                    key=lambda x: x.get("logit", 0),
                    reverse=True
                )
                
                # Apply top_k filter if specified
                if top_k:
                    sorted_rankings = sorted_rankings[:top_k]
                
                # Format results
                reranked = []
                for rank in sorted_rankings:
                    idx = rank.get("index", 0)
                    reranked.append({
                        "index": idx,
                        "text": passages[idx] if idx < len(passages) else "",
                        "score": rank.get("logit", 0.0)
                    })
                
                return reranked
                
        except Exception as e:
            print(f"Reranking error: {e}")
            # Fallback: return passages in original order
            return [
                {"index": i, "text": passage, "score": 0.0}
                for i, passage in enumerate(passages)
            ]
    
    async def semantic_search(
        self,
        query: str,
        documents: List[str],
        top_k: int = 5,
        use_reranking: bool = True
    ) -> List[Dict[str, any]]:
        """
        Perform semantic search with optional reranking.
        
        Args:
            query: Search query
            documents: List of documents to search
            top_k: Number of top results to return
            use_reranking: Whether to apply reranking
            
        Returns:
            List of top matching documents with scores
        """
        # Generate embeddings
        query_embedding = await self.generate_query_embedding(query)
        doc_embeddings = await self.generate_passage_embeddings(documents)
        
        # Calculate cosine similarity
        import numpy as np
        
        query_vec = np.array(query_embedding)
        doc_vecs = np.array(doc_embeddings)
        
        # Normalize vectors
        query_norm = query_vec / np.linalg.norm(query_vec)
        doc_norms = doc_vecs / np.linalg.norm(doc_vecs, axis=1, keepdims=True)
        
        # Compute similarities
        similarities = np.dot(doc_norms, query_norm)
        
        # Get top candidates (2x top_k for reranking)
        candidate_count = min(top_k * 2, len(documents))
        top_indices = np.argsort(similarities)[::-1][:candidate_count]
        
        candidates = [documents[i] for i in top_indices]
        
        # Apply reranking if enabled
        if use_reranking and len(candidates) > 1:
            reranked = await self.rerank_passages(query, candidates, top_k)
            return reranked
        else:
            # Return top_k without reranking
            results = []
            for idx in top_indices[:top_k]:
                results.append({
                    "index": int(idx),
                    "text": documents[idx],
                    "score": float(similarities[idx])
                })
            return results
    
    async def find_similar_documents(
        self,
        reference_text: str,
        candidate_texts: List[str],
        threshold: float = 0.7
    ) -> List[Dict[str, any]]:
        """
        Find documents similar to a reference text.
        
        Args:
            reference_text: Reference document
            candidate_texts: List of candidate documents
            threshold: Similarity threshold (0-1)
            
        Returns:
            List of similar documents with similarity scores
        """
        # Generate embeddings
        all_texts = [reference_text] + candidate_texts
        embeddings = await self.generate_passage_embeddings(all_texts)
        
        import numpy as np
        
        ref_embedding = np.array(embeddings[0])
        candidate_embeddings = np.array(embeddings[1:])
        
        # Normalize
        ref_norm = ref_embedding / np.linalg.norm(ref_embedding)
        cand_norms = candidate_embeddings / np.linalg.norm(
            candidate_embeddings,
            axis=1,
            keepdims=True
        )
        
        # Calculate similarities
        similarities = np.dot(cand_norms, ref_norm)
        
        # Filter by threshold
        results = []
        for i, sim in enumerate(similarities):
            if sim >= threshold:
                results.append({
                    "index": i,
                    "text": candidate_texts[i],
                    "similarity": float(sim)
                })
        
        # Sort by similarity
        results.sort(key=lambda x: x["similarity"], reverse=True)
        
        return results
    
    async def cluster_documents(
        self,
        documents: List[str],
        num_clusters: int = 5
    ) -> Dict[int, List[int]]:
        """
        Cluster documents using embeddings.
        
        Args:
            documents: List of documents to cluster
            num_clusters: Number of clusters
            
        Returns:
            Dict mapping cluster_id to list of document indices
        """
        # Generate embeddings
        embeddings = await self.generate_passage_embeddings(documents)
        
        import numpy as np
        from sklearn.cluster import KMeans
        
        # Perform clustering
        kmeans = KMeans(n_clusters=num_clusters, random_state=42)
        labels = kmeans.fit_predict(embeddings)
        
        # Group by cluster
        clusters = {}
        for idx, label in enumerate(labels):
            label = int(label)
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(idx)
        
        return clusters


# Singleton instance
embedding_service = EmbeddingService()
