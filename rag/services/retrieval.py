import os
from typing import List, Dict, Any
import chromadb
from langchain_huggingface import HuggingFaceEmbeddings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RetrievalService:
    def __init__(self):
        self.chroma_path = os.getenv("CHROMA_PATH", "./research_db")
        self.embedding_model_name = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        
        self.client = None
        self.collection = None
        self.embeddings_model = None
        
    async def initialize(self):
        """Initialize the retrieval service."""
        try:
            os.makedirs(self.chroma_path, exist_ok=True)
            
            self.client = chromadb.PersistentClient(path=self.chroma_path)
            
            try:
                self.collection = self.client.get_collection("stoic_documents")
            except Exception:
                self.collection = self.client.create_collection(
                    name="stoic_documents",
                    metadata={"hnsw:space": "cosine"}
                )
                logger.warning("Created new empty collection. Run /ingest to add documents.")
            
            try:
                self.embeddings_model = HuggingFaceEmbeddings(
                    model_name=self.embedding_model_name
                )
            except Exception as e:
                logger.error(f"Failed to load embedding model: {e}")
                raise
            
            doc_count = self.collection.count()
            if doc_count == 0:
                logger.warning("No documents in collection. Run /ingest to add documents.")
            else:
                logger.info(f"Retrieval service initialized with {doc_count} documents")
                
        except Exception as e:
            logger.error(f"Failed to initialize retrieval service: {e}")
            raise
    
    def _embed_query(self, query: str) -> List[float]:
        """Generate embedding for a query."""
        return self.embeddings_model.embed_query(query)
    
    async def retrieve_documents(
        self, 
        query: str, 
        top_k: int = 5,
        min_similarity: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        Retrieve the most relevant documents for a query.
        
        Args:
            query: The search query
            top_k: Number of documents to retrieve
            min_similarity: Minimum similarity threshold
            
        Returns:
            List of document dictionaries with content and metadata
        """
        try:
            if self.collection.count() == 0:
                logger.warning("No documents available for retrieval")
                return []
            
            query_embedding = self._embed_query(query)
            
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                include=["documents", "metadatas", "distances"]
            )
            
            documents = []
            if results["documents"] and results["documents"][0]:
                for i, doc in enumerate(results["documents"][0]):
                    distance = results["distances"][0][i]
                    similarity = 1 - distance  
                    
                    if similarity >= min_similarity:
                        metadata = results["metadatas"][0][i]
                        
                        document = {
                            "content": doc,
                            "title": metadata.get("title", "Unknown"),
                            "chunk_id": metadata.get("chunk_id", "unknown"),
                            "page": metadata.get("page"),
                            "source_path": metadata.get("source_path", ""),
                            "similarity": round(similarity, 6)
                        }
                        documents.append(document)
            
            logger.info(f"Retrieved {len(documents)} documents for query: {query[:50]}...")
            return documents
            
        except Exception as e:
            logger.error(f"Error retrieving documents: {e}")
            return []
    
    async def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the document collection."""
        try:
            doc_count = self.collection.count()
            
            if doc_count > 0:
                sample_results = self.collection.get(
                    limit=min(100, doc_count),
                    include=["metadatas"]
                )
                
                title_counts = {}
                for metadata in sample_results["metadatas"]:
                    title = metadata.get("title", "Unknown")
                    title_counts[title] = title_counts.get(title, 0) + 1
                
                return {
                    "total_documents": doc_count,
                    "documents_by_source": title_counts,
                    "collection_name": "stoic_documents",
                    "embedding_model": self.embedding_model_name
                }
            else:
                return {
                    "total_documents": 0,
                    "documents_by_source": {},
                    "collection_name": "stoic_documents",
                    "embedding_model": self.embedding_model_name,
                    "message": "No documents in collection. Run /ingest to add documents."
                }
                
        except Exception as e:
            logger.error(f"Error getting collection stats: {e}")
            return {"error": str(e)}
