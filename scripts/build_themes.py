"""
Build Theme Clusters from Survey Text Responses

Usage:
    python scripts/build_themes.py --input data/clean.csv --output artifacts/themes.json

This script:
1. Loads text responses (Q11 suggestions, Q7B experiences)
2. Filters to substantive responses (>15 chars)
3. Embeds text using Gemini text-embedding-004
4. Clusters with K-Means
5. Auto-labels clusters using LLM
6. Extracts representative quotes per cluster
7. Outputs themes.json
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

# Load environment variables (handle Windows encoding issues)
from pathlib import Path
script_dir = Path(__file__).parent.parent
env_file = script_dir / '.env.local'
if env_file.exists():
    # Read with explicit encoding to avoid Windows issues
    try:
        content = env_file.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        content = env_file.read_text(encoding='utf-16')
    for line in content.strip().split('\n'):
        line = line.strip()
        if line and '=' in line and not line.startswith('#'):
            key, value = line.split('=', 1)
            os.environ[key.strip()] = value.strip()

# Check for API key
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY not set in environment")
    print("Please add your key to .env.local or set the environment variable")
    sys.exit(1)

import google.generativeai as genai

genai.configure(api_key=GEMINI_API_KEY)


def load_text_data(csv_path: Path) -> pd.DataFrame:
    """Load and filter text responses (vectorized for performance)."""
    print(f"Loading {csv_path}...")
    # Try UTF-8 first, fall back to latin-1 for Windows files
    try:
        df = pd.read_csv(csv_path, encoding='utf-8')
    except UnicodeDecodeError:
        df = pd.read_csv(csv_path, encoding='latin-1')
    
    # Vectorized text extraction — no iterrows()
    suggestion = df.get('suggestion', pd.Series(dtype=str)).fillna('').astype(str)
    experience = df.get('skip_experience', pd.Series(dtype=str)).fillna('').astype(str)
    
    # Prefer suggestion if > 15 chars, else fall back to experience
    use_suggestion = suggestion.str.len() > 15
    text = suggestion.where(use_suggestion, experience)
    source = pd.Series('suggestion', index=df.index).where(use_suggestion, 'experience')
    
    # Filter to substantive responses
    mask = text.str.len() > 15
    
    result = pd.DataFrame({
        'id': df.get('id', pd.Series(dtype=str)),
        'text': text,
        'source': source,
        'arrival_time': df.get('arrival_time', pd.Series(dtype=str)).fillna(''),
        'mode': df.get('mode', pd.Series(dtype=str)).fillna(''),
        'frequency': df.get('frequency', pd.Series(dtype=str)).fillna(''),
        'skipped_class': df.get('skipped_class', pd.Series(dtype=bool)).fillna(False),
    })[mask].reset_index(drop=True)
    
    print(f"  Found {len(result)} substantive text responses")
    return result


def embed_texts(texts: list[str], batch_size: int = 100) -> np.ndarray:
    """Embed texts using Gemini batch API (sends list per call, not 1-at-a-time)."""
    print(f"Embedding {len(texts)} texts in batches of {batch_size}...")
    embeddings = []
    total_batches = (len(texts) - 1) // batch_size + 1
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        batch_num = i // batch_size + 1
        print(f"  Batch {batch_num}/{total_batches} ({len(batch)} texts)")
        
        # Retry logic for each batch
        for attempt in range(3):
            try:
                result = genai.embed_content(
                    model="models/text-embedding-004",
                    content=batch,
                    task_type="clustering"
                )
                embeddings.extend(result['embedding'])
                break
            except Exception as e:
                error_msg = str(e).lower()
                if attempt < 2 and ('rate' in error_msg or '429' in error_msg or 'quota' in error_msg):
                    delay = 2 ** (attempt + 1)
                    print(f"    Rate limited, waiting {delay}s (attempt {attempt + 1}/3)...")
                    time.sleep(delay)
                else:
                    print(f"    Warning: Batch {batch_num} failed: {e}")
                    # Fall back to individual embedding for this batch
                    for text in batch:
                        try:
                            single = genai.embed_content(
                                model="models/text-embedding-004",
                                content=text,
                                task_type="clustering"
                            )
                            embeddings.append(single['embedding'])
                        except Exception:
                            embeddings.append([0.0] * 768)
                        time.sleep(0.05)
                    break
        
        # Small delay between batches to stay within rate limits
        time.sleep(0.1)
    
    return np.array(embeddings)


def find_optimal_clusters(embeddings: np.ndarray, min_k: int = 4, max_k: int = 10) -> int:
    """Find optimal cluster count using silhouette score."""
    print("Finding optimal cluster count...")
    best_k = min_k
    best_score = -1
    
    for k in range(min_k, max_k + 1):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(embeddings)
        score = silhouette_score(embeddings, labels)
        print(f"  k={k}: silhouette={score:.3f}")
        
        if score > best_score:
            best_score = score
            best_k = k
    
    print(f"  Optimal k={best_k} (silhouette={best_score:.3f})")
    return best_k


def cluster_texts(embeddings: np.ndarray, n_clusters: int) -> tuple[np.ndarray, KMeans]:
    """Cluster embeddings with K-Means."""
    print(f"Clustering into {n_clusters} themes...")
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(embeddings)
    return labels, kmeans


def label_cluster(texts: list[str], model_name: str = "gemini-2.0-flash-001") -> str:
    """Generate a short label for a cluster using LLM."""
    # Sample up to 5 texts
    sample = texts[:5]
    prompt = f"""Below are student comments about university parking. 
Generate a SHORT label (2-4 words) that captures the main theme.

Comments:
{chr(10).join(f'- {t}' for t in sample)}

Reply with ONLY the label, nothing else. Examples: "Cost Concerns", "Need More Spots", "Distance Issues"
"""
    
    # 3 retries with exponential backoff for stability at scale
    max_retries = 3
    base_delay = 1.0  # seconds
    
    for attempt in range(max_retries):
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            label = response.text.strip().strip('"\'')
            return label[:50]  # Limit length
        except Exception as e:
            error_msg = str(e).lower()
            if 'rate' in error_msg or 'quota' in error_msg or '429' in error_msg:
                # Rate limit - wait and retry with exponential backoff
                delay = base_delay * (2 ** attempt)
                print(f"    Rate limited, waiting {delay}s before retry {attempt + 1}/{max_retries}...")
                time.sleep(delay)
            else:
                # Other error - log and fall through
                print(f"    Warning: Failed to label cluster: {e}")
                break
    
    # Fallback: try to generate a simple label from common words
    return generate_fallback_label(texts)


def generate_fallback_label(texts: list[str], used_labels: set = None) -> str:
    """Generate a unique label from common words when LLM fails."""
    if used_labels is None:
        used_labels = set()
    
    # Priority-ordered keyword groups (more specific first)
    keyword_groups = [
        # Location/proximity
        (['close', 'near', 'closer', 'nearby', 'distance'], 'Closer Parking'),
        (['far', 'walk', 'walking', 'remote'], 'Reduce Walking'),
        # Quantity
        (['more', 'spots', 'add', 'increase', 'build', 'expand'], 'Add More Capacity'),
        # Cost
        (['cost', 'expensive', 'price', 'afford', 'cheaper', 'free', 'pay'], 'Lower Costs'),
        # Transit
        (['bus', 'transit', 'shuttle', 'crimson', 'ride', 'route'], 'Improve Transit'),
        # Time
        (['time', 'wait', 'find', 'search', 'faster'], 'Reduce Wait Time'),
        # Accessibility
        (['accessible', 'ada', 'disability', 'handicap'], 'Better Accessibility'),
        # General structure
        (['deck', 'garage', 'structure'], 'Parking Structures'),
        (['lot', 'surface'], 'Surface Lots'),
    ]
    
    text_lower = ' '.join(texts[:15]).lower()
    
    # Score each keyword group
    group_scores = []
    for keywords, label in keyword_groups:
        score = sum(text_lower.count(kw) for kw in keywords)
        if score > 0:
            group_scores.append((score, label))
    
    # Sort by score descending
    group_scores.sort(key=lambda x: x[0], reverse=True)
    
    # Find first unused label
    for score, label in group_scores:
        if label not in used_labels:
            return label
    
    # If all labels used, add suffix to differentiate
    for score, label in group_scores:
        for suffix in ['(Priority)', '(Secondary)', '(Other)']:
            new_label = f"{label} {suffix}"
            if new_label not in used_labels:
                return new_label
    
    # Ultimate fallback
    return f"Theme {len(used_labels) + 1}"


def generate_all_labels(cluster_data: list[dict], model_name: str = "gemini-2.0-flash-001") -> list[str]:
    """Generate ALL cluster labels in one API call to ensure uniqueness."""
    
    # Build prompt with samples from each cluster
    cluster_sections = []
    for i, cluster in enumerate(cluster_data):
        sample_texts = cluster['texts'][:3]  # 3 samples per cluster
        samples = '\n'.join(f'  - {t[:100]}' for t in sample_texts)
        cluster_sections.append(f"CLUSTER {i+1} ({cluster['count']} comments):\n{samples}")
    
    prompt = f"""Below are {len(cluster_data)} different clusters of student comments about university parking.
Each cluster contains related comments. Generate a SHORT, UNIQUE label (2-4 words) for EACH cluster.

IMPORTANT: Each label must be DIFFERENT from the others. Focus on what makes each cluster distinct.

{chr(10).join(cluster_sections)}

Reply with EXACTLY {len(cluster_data)} labels, one per line, in order. No numbering, no quotes, just the labels.
Example format:
Need More Spots
Cost Too High
Distance to Class
Bus Route Issues
"""
    
    # 3 retries with exponential backoff for stability at scale
    max_retries = 3
    base_delay = 1.0
    
    for attempt in range(max_retries):
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            
            # Parse the response into individual labels
            lines = [line.strip() for line in response.text.strip().split('\n') if line.strip()]
            
            # Clean up any numbering or quotes
            labels = []
            for line in lines:
                # Remove numbering like "1." or "1:"
                import re
                cleaned = re.sub(r'^\d+[\.\):\s]+', '', line).strip().strip('"\'')
                if cleaned:
                    labels.append(cleaned[:50])
            
            if len(labels) >= len(cluster_data):
                return labels[:len(cluster_data)]
            else:
                print(f"    Warning: Got {len(labels)} labels, expected {len(cluster_data)}")
                # Pad with fallback labels, tracking used ones
                used_labels = set(labels)
                while len(labels) < len(cluster_data):
                    new_label = generate_fallback_label(cluster_data[len(labels)]['texts'], used_labels)
                    labels.append(new_label)
                    used_labels.add(new_label)
                return labels
                
        except Exception as e:
            error_msg = str(e).lower()
            if 'rate' in error_msg or 'quota' in error_msg or '429' in error_msg:
                delay = base_delay * (2 ** attempt)
                print(f"    Rate limited, waiting {delay}s before retry {attempt + 1}/{max_retries}...")
                time.sleep(delay)
            else:
                print(f"    Warning: Failed to generate labels: {e}")
                break
    
    # Fallback: generate labels from keywords for each cluster, tracking used ones
    print("    Using fallback keyword-based labels...")
    used_labels = set()
    labels = []
    for c in cluster_data:
        label = generate_fallback_label(c['texts'], used_labels)
        labels.append(label)
        used_labels.add(label)
    return labels


def get_representative_quotes(
    texts: list[str],
    embeddings: np.ndarray,
    centroid: np.ndarray,
    n_quotes: int = 5
) -> list[str]:
    """Get quotes closest to cluster centroid."""
    # Calculate distances to centroid
    distances = np.linalg.norm(embeddings - centroid, axis=1)
    
    # Get indices of closest texts
    closest_indices = np.argsort(distances)[:n_quotes]
    
    return [texts[i] for i in closest_indices]


def build_themes(
    df: pd.DataFrame,
    embeddings: np.ndarray,
    labels: np.ndarray,
    kmeans: KMeans,
    n_quotes: int = 5
) -> list[dict]:
    """Build theme objects with labels and quotes."""
    print("Building theme objects...")
    
    # First, collect all cluster data
    cluster_data = []
    for cluster_id in range(kmeans.n_clusters):
        mask = labels == cluster_id
        cluster_texts = df[mask]['text'].tolist()
        cluster_embeddings = embeddings[mask]
        cluster_df = df[mask]
        
        if len(cluster_texts) == 0:
            continue
            
        cluster_data.append({
            'id': cluster_id,
            'texts': cluster_texts,
            'embeddings': cluster_embeddings,
            'df': cluster_df,
            'count': len(cluster_texts),
        })
    
    # Generate ALL labels in one API call to ensure uniqueness
    print(f"  Generating {len(cluster_data)} unique labels...")
    all_labels = generate_all_labels(cluster_data)
    
    themes = []
    for i, cluster in enumerate(cluster_data):
        print(f"  Cluster {cluster['id']}: {cluster['count']} texts")
        
        label = all_labels[i] if i < len(all_labels) else f"Theme {i+1}"
        print(f"    Label: {label}")
        
        # Get representative quotes
        quotes = get_representative_quotes(
            cluster['texts'],
            cluster['embeddings'],
            kmeans.cluster_centers_[cluster['id']],
            n_quotes
        )
        
        # Calculate segment breakdown
        segments = {
            'by_arrival_time': cluster['df']['arrival_time'].value_counts().to_dict(),
            'by_mode': cluster['df']['mode'].value_counts().to_dict(),
            'skip_rate': cluster['df']['skipped_class'].mean() if 'skipped_class' in cluster['df'] else None,
        }
        themes.append({
            'id': cluster['id'],
            'label': label,
            'count': cluster['count'],
            'pct': round(cluster['count'] / len(df) * 100, 1),
            'quotes': quotes,
            'segments': segments,
        })
    
    # Sort by count descending
    themes.sort(key=lambda x: x['count'], reverse=True)
    
    return themes


def main():
    parser = argparse.ArgumentParser(description='Build theme clusters from survey text')
    parser.add_argument('--input', '-i', required=True, help='Path to clean.csv')
    parser.add_argument('--output', '-o', required=True, help='Path to output themes.json')
    parser.add_argument('--clusters', '-k', type=int, default=0, help='Number of clusters (0=auto)')
    parser.add_argument('--quotes', '-q', type=int, default=5, help='Quotes per cluster')
    args = parser.parse_args()
    
    input_path = Path(args.input)
    output_path = Path(args.output)
    
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)
    
    # Load data
    df = load_text_data(input_path)
    
    if len(df) < 10:
        print("Error: Not enough text responses for clustering")
        sys.exit(1)
    
    # Embed
    embeddings = embed_texts(df['text'].tolist())
    
    # Determine cluster count
    n_clusters = args.clusters
    if n_clusters == 0:
        n_clusters = find_optimal_clusters(embeddings)
    
    # Cluster
    labels, kmeans = cluster_texts(embeddings, n_clusters)
    
    # Build themes
    themes = build_themes(df, embeddings, labels, kmeans, args.quotes)
    
    # Output
    output = {
        'metadata': {
            'generated_at': pd.Timestamp.now().isoformat(),
            'input_file': str(input_path),
            'total_texts': len(df),
            'n_clusters': n_clusters,
        },
        'themes': themes,
    }
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, default=str)
    
    print(f"\n✅ Saved themes to {output_path}")
    print(f"\n📊 Theme Summary:")
    for theme in themes:
        print(f"  {theme['label']}: {theme['count']} ({theme['pct']}%)")


if __name__ == '__main__':
    main()
