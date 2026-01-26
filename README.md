# UA Parking Intelligence Platform

A full-stack analytics platform for university parking survey analysis. Built with Next.js, FastAPI, and Supabase.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- Supabase account (free tier works)

### Installation

```bash
# Clone the repo
git clone <your-repo-url>
cd ua-parking-platform

# Install frontend dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env.local
# Then fill in your values in .env.local
```

### Environment Variables

See `.env.example` for all required variables. You must set:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `GEMINI_API_KEY` - Google AI API key for embeddings

## 📊 Data Pipeline

### Step 1: Ingest and Clean Survey Data

```bash
# Place your Qualtrics export in data/raw/ (not tracked by git)
python scripts/load_qualtrics.py --input data/raw/survey.xlsx --output data/clean.csv
```

### Step 2: Build Metrics and Themes

```bash
python scripts/build_rollups.py --input data/clean.csv --output artifacts/
```

### Outputs
- `artifacts/metrics.json` - Aggregated statistics with n/N denominators
- `artifacts/themes.json` - Clustered themes with representative quotes
- `artifacts/rankings.json` - Weighted priority scores

## 🧪 Smoke Test Checklist

```bash
# 1. Install dependencies
npm install
pip install -r requirements.txt

# 2. Run pipeline on sample data
python scripts/load_qualtrics.py --input data/raw/sample.xlsx --output data/clean.csv
python scripts/build_rollups.py --input data/clean.csv --output artifacts/

# 3. Start development server
npm run dev

# 4. Verify build works
npm run build
```

## 🏗️ Project Structure

```
ua-parking-platform/
├── app/                    # Next.js App Router pages
├── components/             # React components
├── lib/                    # Shared utilities
├── scripts/                # Python pipeline scripts
│   ├── load_qualtrics.py   # Ingestion + PII scrubbing
│   └── build_rollups.py    # Metrics and theme computation
├── data/                   # Data files (gitignored except samples)
│   ├── raw/                # Raw Qualtrics exports (gitignored)
│   └── clean.csv           # PII-scrubbed data (gitignored by default)
├── artifacts/              # Pipeline outputs (JSON, tracked)
├── docs/                   # Documentation
│   └── data_contract.md    # PII handling and schema docs
├── config/                 # Centralized configuration
└── public/                 # Static assets
```

## 📝 Data Contract

See [docs/data_contract.md](docs/data_contract.md) for:
- Which columns are dropped (PII)
- Which columns are kept
- How quotes are anonymized

## 🔒 Security Notes

- Raw survey files (XLSX) are **never** committed
- `clean.csv` is gitignored by default
- All quotes in `themes.json` are anonymized (no emails, names, or identifiers)
- `.env` files are gitignored; use `.env.example` as template

## 📦 Dependencies

### Frontend (Node.js)
- Next.js 14 - React framework with App Router
- Tailwind CSS - Styling
- Recharts - Charting library
- @supabase/supabase-js - Database client

### Backend (Python)
- pandas - Data manipulation
- numpy - Numerical operations
- scikit-learn - Clustering
- google-generativeai - Gemini embeddings
- openpyxl - Excel file reading

## 📄 License

MIT
