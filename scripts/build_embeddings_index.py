"""
Build Embeddings Index for RAG Chat

Usage:
    python scripts/build_embeddings_index.py

This script:
1. Loads all text responses from clean.csv
2. Embeds them with Gemini text-embedding-004
3. Saves to artifacts/embeddings_index.json for RAG search
"""

import os
import json
import time
import numpy as np
import pandas as pd
from pathlib import Path

# Load environment variables (handle Windows encoding issues)
script_dir = Path(__file__).parent.parent
env_file = script_dir / '.env.local'
if env_file.exists():
    try:
        content = env_file.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        content = env_file.read_text(encoding='utf-16')
    for line in content.strip().split('\n'):
        line = line.strip()
        if line and '=' in line and not line.startswith('#'):
            key, value = line.split('=', 1)
            os.environ[key.strip()] = value.strip()

import google.generativeai as genai

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment")

genai.configure(api_key=GEMINI_API_KEY)


def load_texts(csv_path: Path) -> list[dict]:
    """Load all text responses with metadata."""
    print(f"Loading {csv_path}...")
    try:
        df = pd.read_csv(csv_path, encoding='utf-8')
    except UnicodeDecodeError:
        df = pd.read_csv(csv_path, encoding='latin-1')
    
    texts = []
    
    # Suggestion column (main improvement suggestions)
    if 'suggestion' in df.columns:
        for idx, row in df.iterrows():
            text = str(row.get('suggestion', '')).strip()
            if text and text.lower() not in ['nan', 'na', 'n/a', '']:
                if len(text) > 10:  # Skip very short responses
                    texts.append({
                        'id': f"suggestion_{idx}",
                        'text': text,
                        'source': 'suggestion',
                        'arrival_time': str(row.get('arrival_time', 'Unknown')),
                        'mode': str(row.get('mode', 'Unknown')),
                    })
    
    # Skip experience column (narratives about skipping class)
    if 'skip_experience' in df.columns:
        for idx, row in df.iterrows():
            text = str(row.get('skip_experience', '')).strip()
            if text and text.lower() not in ['nan', 'na', 'n/a', '']:
                if len(text) > 10:
                    texts.append({
                        'id': f"experience_{idx}",
                        'text': text,
                        'source': 'experience',
                        'arrival_time': str(row.get('arrival_time', 'Unknown')),
                        'mode': str(row.get('mode', 'Unknown')),
                    })
    
    # ADA improvement column (accessibility feedback)
    if 'ada_improvement' in df.columns:
        for idx, row in df.iterrows():
            text = str(row.get('ada_improvement', '')).strip()
            if text and text.lower() not in ['nan', 'na', 'n/a', '']:
                if len(text) > 10:
                    texts.append({
                        'id': f"ada_{idx}",
                        'text': text,
                        'source': 'accessibility',
                        'arrival_time': str(row.get('arrival_time', 'Unknown')),
                        'mode': str(row.get('mode', 'Unknown')),
                    })
    
    print(f"  Found {len(texts)} text responses")
    return texts


def embed_texts(texts: list[dict], batch_size: int = 20) -> list[dict]:
    """Embed all texts and add embedding vectors."""
    print(f"Embedding {len(texts)} texts...")
    
    n_batches = (len(texts) + batch_size - 1) // batch_size
    
    for i in range(0, len(texts), batch_size):
        batch_num = i // batch_size + 1
        print(f"  Batch {batch_num}/{n_batches}")
        
        for j in range(i, min(i + batch_size, len(texts))):
            text = texts[j]['text']
            
            # Retry logic with exponential backoff
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    result = genai.embed_content(
                        model="models/embedding-001",
                        content=text,
                        task_type="retrieval_document"
                    )
                    texts[j]['embedding'] = result['embedding']
                    break  # Success
                    
                except Exception as e:
                    error_msg = str(e).lower()
                    if 'rate' in error_msg or 'quota' in error_msg or '429' in error_msg:
                        delay = 2.0 * (2 ** attempt)
                        print(f"    Rate limited, waiting {delay}s...")
                        time.sleep(delay)
                    else:
                        print(f"    Error embedding text: {e}")
                        # Use zero vector as fallback
                        texts[j]['embedding'] = [0.0] * 768
                        break
            
            # Small delay between each text to avoid rate limits
            time.sleep(0.1)
    
    return texts


def save_index(texts: list[dict], output_path: Path):
    """Save embeddings index to JSON."""
    print(f"Saving to {output_path}...")
    
    # Convert numpy arrays to lists for JSON serialization
    for t in texts:
        if 'embedding' in t and isinstance(t['embedding'], np.ndarray):
            t['embedding'] = t['embedding'].tolist()
    
    index = {
        'metadata': {
            'total_texts': len(texts),
            'embedding_dim': len(texts[0]['embedding']) if texts else 0,
            'model': 'text-embedding-004',
            'generated_at': pd.Timestamp.now().isoformat(),
        },
        'documents': texts
    }
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=2)
    
    print(f"✅ Saved {len(texts)} documents with embeddings")


def main():
    csv_path = script_dir / 'data' / 'clean.csv'
    output_path = script_dir / 'artifacts' / 'embeddings_index.json'
    
    if not csv_path.exists():
        raise FileNotFoundError(f"Data file not found: {csv_path}")
    
    texts = load_texts(csv_path)
    texts = embed_texts(texts)
    save_index(texts, output_path)


if __name__ == '__main__':
    main()
