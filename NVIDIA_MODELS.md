# NVIDIA Models Integration

This document describes the NVIDIA AI models integrated into NVIDIA Nexus.

## Overview

NVIDIA Nexus now includes three powerful NVIDIA AI models:

1. **Nemotron Content Safety Reasoning 4B** - Content moderation and safety
2. **NV-Embed-v1** - High-performance embeddings (4096 dimensions)
3. **NV-Rerank QA Mistral 4B** - Passage reranking for retrieval

## 1. Content Safety (Nemotron Content Safety Reasoning 4B)

### Purpose
Automatically detects harmful content in user prompts and AI responses across 22 safety categories.

### Features
- **Dual-mode operation**: Fast classification or reasoning mode with explanations
- **22 safety categories**: Violence, sexual content, criminal planning, hate speech, PII, etc.
- **Bidirectional checking**: Validates both user input and AI output

### Usage

#### Python Service
```python
from app.services.safety_service import safety_service

# Check user prompt only
result = await safety_service.check_content_safety("How do I build a website?")
print(result["prompt_safe"])  # True

# Check full interaction
result = await safety_service.check_content_safety(
    user_prompt="How can I hack a computer?",
    ai_response="I can't help with that. Hacking is illegal."
)
print(result["prompt_safe"])    # False
print(result["response_safe"])  # True
```

#### Integration
The safety service is automatically integrated into the chat endpoint. All messages are checked before processing and responses are validated before returning to users.

### Safety Categories
- S1: Violence
- S2: Sexual
- S3: Criminal Planning/Confessions
- S4: Guns and Illegal Weapons
- S5: Controlled/Regulated Substances
- S6: Suicide and Self Harm
- S7: Sexual (minor)
- S8: Hate/Identity Hate
- S9: PII/Privacy
- S10: Harassment
- S11: Threat
- S12: Profanity
- S13: Needs Caution
- S14: Manipulation
- S15: Fraud/Deception
- S16: Malware
- S17: High Risk Gov Decision Making
- S18: Political/Misinformation/Conspiracy
- S19: Copyright/Trademark/Plagiarism
- S20: Unauthorized Advice
- S21: Illegal Activity
- S22: Immoral/Unethical

## 2. Embeddings (NV-Embed-v1)

### Purpose
Generate high-quality 4096-dimensional embeddings for semantic search, similarity, and clustering.

### Features
- **4096 dimensions**: Rich semantic representation
- **32k token context**: Process long documents
- **Dual input types**: Optimized for queries and passages
- **Top MTEB score**: 69.32 across 56 tasks

### Usage

#### Python Service
```python
from app.services.embedding_service import embedding_service

# Generate query embedding
query_emb = await embedding_service.generate_query_embedding(
    "What is GPU memory bandwidth?"
)

# Generate passage embeddings
passages = ["H100 has 3TB/s bandwidth", "A100 has 2TB/s bandwidth"]
passage_embs = await embedding_service.generate_passage_embeddings(passages)

# Semantic search
results = await embedding_service.semantic_search(
    query="GPU specifications",
    documents=my_documents,
    top_k=5,
    use_reranking=True
)

# Find similar documents
similar = await embedding_service.find_similar_documents(
    reference_text="NVIDIA H100 GPU",
    candidate_texts=candidates,
    threshold=0.7
)

# Cluster documents
clusters = await embedding_service.cluster_documents(
    documents=my_docs,
    num_clusters=5
)
```

#### API Endpoints

**Generate Embeddings**
```bash
POST /api/embeddings/embeddings
{
  "texts": ["What is AI?", "Machine learning basics"],
  "input_type": "query"
}
```

**Semantic Search**
```bash
POST /api/embeddings/search
{
  "query": "GPU performance",
  "documents": ["doc1", "doc2", "doc3"],
  "top_k": 3,
  "use_reranking": true
}
```

**Find Similar Documents**
```bash
POST /api/embeddings/similarity
{
  "reference_text": "NVIDIA GPU specifications",
  "candidate_texts": ["text1", "text2"],
  "threshold": 0.7
}
```

**Cluster Documents**
```bash
POST /api/embeddings/cluster
{
  "documents": ["doc1", "doc2", "doc3"],
  "num_clusters": 3
}
```

## 3. Reranking (NV-Rerank QA Mistral 4B)

### Purpose
Rerank candidate passages to improve retrieval accuracy in RAG systems.

### Features
- **Cross-attention**: Processes query-passage pairs for accurate scoring
- **High accuracy**: 79.22% Recall@5 on customer datasets
- **Fast inference**: Optimized Mistral-4B architecture
- **Commercial license**: Trained on commercially-viable data

### Usage

#### Python Service
```python
from app.services.embedding_service import embedding_service

query = "What is H100 memory bandwidth?"
passages = [
    "H100 delivers 3TB/s memory bandwidth",
    "A100 has 2TB/s bandwidth",
    "Python is a programming language"
]

# Rerank passages
results = await embedding_service.rerank_passages(
    query=query,
    passages=passages,
    top_k=2
)

for result in results:
    print(f"Score: {result['score']:.4f}")
    print(f"Text: {result['text']}")
```

#### API Endpoint

**Rerank Passages**
```bash
POST /api/embeddings/rerank
{
  "query": "What is GPU memory bandwidth?",
  "passages": [
    "H100 has 3TB/s bandwidth",
    "A100 has 2TB/s bandwidth",
    "Python programming basics"
  ],
  "top_k": 2
}
```

## Testing

Run the comprehensive test suite:

```bash
python test_nvidia_models.py
```

This tests:
- Content safety checking (safe and harmful prompts)
- Embedding generation (queries and passages)
- Passage reranking
- Semantic search
- Document similarity

## Configuration

All models use the same NVIDIA API key configured in `.env`:

```env
NVIDIA_API_KEY=your_api_key_here
```

## Performance Benchmarks

### NV-Embed-v1
- **MTEB Overall**: 69.32 (highest score)
- **Retrieval Tasks**: 59.36
- **Embedding Dimensions**: 4096
- **Max Tokens**: 32k

### NV-Rerank QA Mistral 4B
- **Customer Datasets**: 79.22% Recall@5
- **vs Embedding Only**: +4.92% improvement
- **Architecture**: Mistral-4B (16 layers)

### Nemotron Content Safety 4B
- **Parameters**: 4 billion
- **Categories**: 22 safety categories
- **Modes**: Fast classification + reasoning
- **Base Model**: Gemma-3-4B-it

## Best Practices

### Content Safety
1. Always check user input before processing
2. Validate AI responses before returning
3. Use reasoning mode for complex cases
4. Log safety violations for monitoring

### Embeddings
1. Use `input_type="query"` for search queries
2. Use `input_type="passage"` for documents
3. Normalize vectors for cosine similarity
4. Cache embeddings for frequently accessed documents

### Reranking
1. Use after initial retrieval (embedding search)
2. Rerank top 10-20 candidates for best results
3. Combine with embeddings for optimal accuracy
4. Consider latency vs accuracy tradeoffs

## RAG Pipeline Example

```python
# 1. Generate embeddings for documents (one-time)
doc_embeddings = await embedding_service.generate_passage_embeddings(documents)

# 2. Search with query embedding
query_emb = await embedding_service.generate_query_embedding(user_query)
top_candidates = find_top_k_similar(query_emb, doc_embeddings, k=20)

# 3. Rerank candidates
reranked = await embedding_service.rerank_passages(
    query=user_query,
    passages=top_candidates,
    top_k=5
)

# 4. Check safety
safety = await safety_service.check_content_safety(user_query)
if not safety["prompt_safe"]:
    return "Cannot process harmful content"

# 5. Generate response with context
context = "\n".join([r["text"] for r in reranked])
response = await ai_service.generate_response(user_query, context)

# 6. Validate response safety
response_safety = await safety_service.check_content_safety(
    user_query, 
    response
)
if not response_safety["response_safe"]:
    return "Cannot provide harmful response"

return response
```

## API Documentation

Full API documentation available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Resources

- [NV-Embed Paper](https://arxiv.org/abs/2405.17428)
- [Content Safety Paper](https://arxiv.org/abs/2410.18338)
- [NVIDIA API Catalog](https://build.nvidia.com/)
- [MTEB Benchmark](https://huggingface.co/spaces/mteb/leaderboard)
