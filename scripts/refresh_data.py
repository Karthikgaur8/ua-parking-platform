"""
One-Command Data Refresh Pipeline

Usage:
    python scripts/refresh_data.py
    python scripts/refresh_data.py --input data/raw/survey.xlsx
    python scripts/refresh_data.py --skip-themes   # skip embedding (faster, keeps old themes)

This script orchestrates the full pipeline:
1. load_qualtrics.py  →  data/clean.csv
2. build_rollups.py   →  artifacts/metrics.json
3. build_themes.py    →  artifacts/themes.json  (calls Gemini API for embeddings)

After running, just push to GitHub and Vercel auto-deploys.
"""

import argparse
import subprocess
import sys
import time
from pathlib import Path


# Resolve paths relative to project root
PROJECT_ROOT = Path(__file__).parent.parent
SCRIPTS_DIR = PROJECT_ROOT / 'scripts'
DATA_DIR = PROJECT_ROOT / 'data'
ARTIFACTS_DIR = PROJECT_ROOT / 'artifacts'
DEFAULT_INPUT = DATA_DIR / 'raw' / 'survey.xlsx'


def run_step(name: str, cmd: list[str]) -> bool:
    """Run a pipeline step and return success/failure."""
    print(f"\n{'='*60}")
    print(f"  STEP: {name}")
    print(f"{'='*60}\n")
    
    start = time.time()
    result = subprocess.run(cmd, cwd=str(PROJECT_ROOT))
    elapsed = time.time() - start
    
    if result.returncode != 0:
        print(f"\n❌ FAILED: {name} (exit code {result.returncode})")
        return False
    
    print(f"\n✅ {name} completed in {elapsed:.1f}s")
    return True


def main():
    parser = argparse.ArgumentParser(
        description='One-command data refresh: XLSX → clean → metrics → themes'
    )
    parser.add_argument(
        '--input', '-i',
        default=str(DEFAULT_INPUT),
        help=f'Path to Qualtrics XLSX export (default: {DEFAULT_INPUT})'
    )
    parser.add_argument(
        '--skip-themes',
        action='store_true',
        help='Skip theme building (faster, keeps existing themes.json)'
    )
    parser.add_argument(
        '--clusters', '-k',
        type=int, default=0,
        help='Number of theme clusters (0=auto-detect)'
    )
    args = parser.parse_args()
    
    input_path = Path(args.input)
    clean_csv = DATA_DIR / 'clean.csv'
    
    # Validate input
    if not input_path.exists():
        print(f"❌ Input file not found: {input_path}")
        print(f"\nTo use this script:")
        print(f"  1. Export survey from Qualtrics as XLSX")
        print(f"  2. Save it to: {DEFAULT_INPUT}")
        print(f"  3. Run: python scripts/refresh_data.py")
        sys.exit(1)
    
    print(f"🔄 Starting data refresh pipeline")
    print(f"   Input:  {input_path}")
    print(f"   Output: {ARTIFACTS_DIR}/")
    
    total_start = time.time()
    python = sys.executable  # Use same Python interpreter
    
    # Step 1: Clean raw data
    success = run_step(
        "Clean Qualtrics Data",
        [python, str(SCRIPTS_DIR / 'load_qualtrics.py'),
         '--input', str(input_path),
         '--output', str(clean_csv)]
    )
    if not success:
        sys.exit(1)
    
    # Step 2: Build metrics rollups
    success = run_step(
        "Build Metrics & Rollups",
        [python, str(SCRIPTS_DIR / 'build_rollups.py'),
         '--input', str(clean_csv),
         '--output', str(ARTIFACTS_DIR)]
    )
    if not success:
        sys.exit(1)
    
    # Step 3: Build themes (optional, calls Gemini API)
    if args.skip_themes:
        print(f"\n⏭️  Skipping theme building (--skip-themes flag)")
        themes_path = ARTIFACTS_DIR / 'themes.json'
        if themes_path.exists():
            print(f"   Using existing: {themes_path}")
        else:
            print(f"   ⚠️  Warning: {themes_path} does not exist!")
    else:
        cluster_args = []
        if args.clusters > 0:
            cluster_args = ['--clusters', str(args.clusters)]
        
        success = run_step(
            "Build Theme Clusters (Gemini API)",
            [python, str(SCRIPTS_DIR / 'build_themes.py'),
             '--input', str(clean_csv),
             '--output', str(ARTIFACTS_DIR / 'themes.json')]
            + cluster_args
        )
        if not success:
            print("\n⚠️  Theme building failed. Metrics are still updated.")
            print("    You can retry with: python scripts/build_themes.py -i data/clean.csv -o artifacts/themes.json")
    
    # Summary
    total_elapsed = time.time() - total_start
    print(f"\n{'='*60}")
    print(f"  🎉 PIPELINE COMPLETE — {total_elapsed:.1f}s total")
    print(f"{'='*60}")
    print(f"\n  Updated files:")
    print(f"    • data/clean.csv")
    print(f"    • artifacts/metrics.json")
    if not args.skip_themes:
        print(f"    • artifacts/themes.json")
    print(f"\n  Next steps:")
    print(f"    git add artifacts/ data/clean.csv")
    print(f"    git commit -m 'data: Refresh survey data'")
    print(f"    git push origin main")
    print(f"    → Vercel auto-deploys in ~1-2 minutes\n")


if __name__ == '__main__':
    main()
