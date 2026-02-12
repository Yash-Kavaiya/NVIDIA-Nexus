from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.embedding_service import embedding_service


router = APIRouter()


class EmbeddingRequest(BaseModel):
    texts: List[str]
    input_type: str = "query"


class RerankRequest(BaseModel):
    query: str
    passages: List[str]
    top_k: Optional[int] = None


class SemanticSearchRequest(BaseModel):
    query: str
    documents: List[str]
    top_k: int = 5
    use_reranking: bool = True


class SimilarityRequest(BaseModel):
    reference_text: str
    candidate_texts: List[str]
    threshold: float = 0.7


class ClusterRequest(BaseModel):
    documents: List[str]
    num_clusters: int = 5


@router.post("/embeddings")
async def generate_embeddings(request: EmbeddingRequest):
    """Generate embeddings for text using NVIDIA NV-Embed-v1"""
    try:
        embeddings = await embedding_service.generate_embeddings(
            request.texts,
            input_type=request.input_type
        )
        return {
            "embeddings": embeddings,
            "model": "nvidia/nv-embed-v1",
            "dimensions": 4096
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rerank")
async def rerank_passages(request: RerankRequest):
    """Rerank passages using NVIDIA Retrieval QA Ranking Model"""
    try:
        results = await embedding_service.rerank_passages(
            request.query,
            request.passages,
            request.top_k
        )
        return {
            "rankings": results,
            "model": "nv-rerank-qa-mistral-4b:1"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def semantic_search(request: SemanticSearchRequest):
    """Perform semantic search with optional reranking"""
    try:
        results = await embedding_service.semantic_search(
            request.query,
            request.documents,
            request.top_k,
            request.use_reranking
        )
        return {
            "results": results,
            "query": request.query,
            "total_documents": len(request.documents),
            "returned": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/similarity")
async def find_similar(request: SimilarityRequest):
    """Find documents similar to a reference text"""
    try:
        results = await embedding_service.find_similar_documents(
            request.reference_text,
            request.candidate_texts,
            request.threshold
        )
        return {
            "similar_documents": results,
            "threshold": request.threshold,
            "found": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cluster")
async def cluster_documents(request: ClusterRequest):
    """Cluster documents using embeddings"""
    try:
        clusters = await embedding_service.cluster_documents(
            request.documents,
            request.num_clusters
        )
        return {
            "clusters": clusters,
            "num_clusters": len(clusters),
            "total_documents": len(request.documents)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
