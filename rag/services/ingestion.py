import os
import json
import hashlib
from pathlib import Path
from typing import List, Dict, Any
import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_huggingface import HuggingFaceEmbeddings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DocumentIngestionService:
    def __init__(self):
        self.chroma_path = os.getenv("CHROMA_PATH", "./research_db")
        self.pdfs_path = os.getenv("PDFS_PATH", "../data/pdfs")
        self.embedding_model_name = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        self.chunk_size = int(os.getenv("CHUNK_SIZE", "1000"))
        self.chunk_overlap = int(os.getenv("CHUNK_OVERLAP", "200"))
        
        self.client = None
        self.collection = None
        self.embeddings_model = None
        self.text_splitter = None
        self.manifest_path = Path(self.chroma_path) / "ingestion_manifest.json"
        
    async def initialize(self):
        """Initialize the ingestion service."""
        try:
            # Initialize ChromaDB
            self.client = chromadb.PersistentClient(path=self.chroma_path)
            self.collection = self.client.get_or_create_collection(
                name="stoic_documents",
                metadata={"hnsw:space": "cosine"}
            )
            
            # Initialize embeddings model
            self.embeddings_model = HuggingFaceEmbeddings(
                model_name=self.embedding_model_name
            )
            
            # Initialize text splitter
            self.text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
                separators=["\n\n", "\n", ". ", " ", ""]
            )
            
            logger.info("Document ingestion service initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize ingestion service: {e}")
            raise
    
    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA-256 hash of a file."""
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
    
    def _load_manifest(self) -> Dict[str, Any]:
        """Load the ingestion manifest."""
        if self.manifest_path.exists():
            with open(self.manifest_path, 'r') as f:
                return json.load(f)
        return {"files": {}}
    
    def _save_manifest(self, manifest: Dict[str, Any]):
        """Save the ingestion manifest."""
        self.manifest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
    
    def _load_pdf(self, file_path: Path) -> List[Any]:
        """Load a PDF file and return its documents."""
        try:
            loader = PyPDFLoader(str(file_path))
            documents = loader.load()
            logger.info(f"Successfully loaded: {file_path.name}")
            return documents
        except Exception as e:
            logger.error(f"Error loading {file_path}: {e}")
            return []
    
    def _chunk_documents(self, documents: List[Any], title: str) -> List[Dict[str, Any]]:
        """Split documents into chunks with metadata."""
        chunks = []
        
        for doc_idx, document in enumerate(documents):
            # Split the document text
            text_chunks = self.text_splitter.split_text(document.page_content)
            
            # Create chunk data with metadata
            for chunk_idx, chunk_text in enumerate(text_chunks):
                chunk_id = f"{title}_doc{doc_idx}_{chunk_idx}"
                
                chunk_data = {
                    "content": chunk_text,
                    "title": title,
                    "chunk_id": chunk_id,
                    "page": document.metadata.get("page", None),
                    "source_path": str(document.metadata.get("source", ""))
                }
                chunks.append(chunk_data)
        
        return chunks
    
    def _embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts."""
        return self.embeddings_model.embed_documents(texts)
    
    def _insert_chunks(self, chunks: List[Dict[str, Any]]) -> int:
        """Insert chunks into ChromaDB collection."""
        if not chunks:
            return 0
        
        # Get next available ID
        next_id = self.collection.count()
        
        # Extract content for embedding
        documents_content = [chunk["content"] for chunk in chunks]
        
        # Generate embeddings
        embeddings = self._embed_documents(documents_content)
        
        # Prepare metadata (excluding content which goes in documents)
        metadatas = [
            {
                "title": chunk["title"],
                "chunk_id": chunk["chunk_id"],
                "page": chunk["page"],
                "source_path": chunk["source_path"]
            }
            for chunk in chunks
        ]
        
        # Generate IDs
        ids = [f"chunk_{next_id + i}" for i in range(len(chunks))]
        
        # Insert into collection
        self.collection.add(
            embeddings=embeddings,
            ids=ids,
            documents=documents_content,
            metadatas=metadatas
        )
        
        return len(chunks)
    
    async def ingest_pdfs(self) -> Dict[str, Any]:
        """
        Ingest all PDF files from the pdfs directory.
        Returns summary of ingestion process.
        """
        pdfs_dir = Path(self.pdfs_path)
        
        if not pdfs_dir.exists():
            raise FileNotFoundError(f"PDFs directory not found: {pdfs_dir}")
        
        # Load existing manifest
        manifest = self._load_manifest()
        
        # Find all PDF files
        pdf_files = list(pdfs_dir.glob("*.pdf"))
        
        if not pdf_files:
            logger.warning(f"No PDF files found in {pdfs_dir}")
            return {
                "message": "No PDF files found",
                "processed_files": [],
                "skipped_files": [],
                "total_chunks": 0
            }
        
        processed_files = []
        skipped_files = []
        total_chunks = 0
        
        for pdf_file in pdf_files:
            try:
                # Calculate file hash
                current_hash = self._calculate_file_hash(pdf_file)
                file_key = str(pdf_file.name)
                
                # Check if file has changed
                if file_key in manifest["files"]:
                    stored_hash = manifest["files"][file_key]["hash"]
                    if current_hash == stored_hash:
                        logger.info(f"Skipping unchanged file: {pdf_file.name}")
                        skipped_files.append(pdf_file.name)
                        continue
                
                # Load and process the PDF
                logger.info(f"Processing: {pdf_file.name}")
                documents = self._load_pdf(pdf_file)
                
                if not documents:
                    logger.warning(f"No content extracted from: {pdf_file.name}")
                    continue
                
                # Create document title from filename
                title = pdf_file.stem.replace("_", " ").replace("-", " ").title()
                
                # Split into chunks
                chunks = self._chunk_documents(documents, title)
                
                if chunks:
                    # Insert chunks into database
                    chunks_inserted = self._insert_chunks(chunks)
                    total_chunks += chunks_inserted
                    
                    # Update manifest
                    manifest["files"][file_key] = {
                        "hash": current_hash,
                        "title": title,
                        "chunks": len(chunks),
                        "processed_at": str(pd.Timestamp.now())
                    }
                    
                    processed_files.append(pdf_file.name)
                    logger.info(f"Processed {pdf_file.name}: {len(chunks)} chunks")
                
            except Exception as e:
                logger.error(f"Error processing {pdf_file}: {e}")
                continue
        
        # Save updated manifest
        self._save_manifest(manifest)
        
        result = {
            "message": f"Ingestion completed. Processed {len(processed_files)} files, skipped {len(skipped_files)} files.",
            "processed_files": processed_files,
            "skipped_files": skipped_files,
            "total_chunks": total_chunks
        }
        
        logger.info(f"Ingestion summary: {result}")
        return result
