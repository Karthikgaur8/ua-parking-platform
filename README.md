# 🅿️ UA Parking Intelligence Platform

> **Full-stack analytics platform** transforming 390 raw survey responses into actionable insights using AI-powered theme clustering, semantic embeddings, and interactive data visualization.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)](https://python.org)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-orange?logo=google)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## ✨ Key Features

### 📊 Executive Dashboard
Real-time visualization of survey insights with **consulting-grade metrics**:
- **Skip Rate**: 79.8% of students have skipped class due to parking (260/326)
- **Difficulty Rate**: 80.5% report parking as difficult (265/329)
- **Weighted Rankings**: Challenge priorities using 3×rank1 + 2×rank2 + rank3 scoring

![Dashboard Preview](docs/images/dashboard-preview.png)

### 🧠 AI-Powered Theme Clustering
Unsupervised NLP pipeline that automatically categorizes 289 free-text responses:

| Theme | Count | Insight |
|-------|-------|---------|
| Closer Parking | 141 (48.8%) | Students want spots nearer to classes |
| Add More Capacity | 88 (30.4%) | General parking shortage |
| Lower Costs | 31 (10.7%) | Price is a barrier |
| Improve Transit | 29 (10.0%) | Bus reliability issues |

**Technical Implementation:**
- **Gemini text-embedding-004** for 768-dimensional semantic vectors
- **K-Means clustering** with silhouette score optimization (optimal k=4)
- **LLM-enhanced labeling** with exponential backoff + intelligent fallback
- **Representative quote extraction** (nearest to cluster centroid)

### 🔍 Evidence Engine
Interactive theme browser with:
- Searchable quote database
- Segment breakdown by arrival time and transport mode
- Skip rate correlation per theme

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BATCH ETL PIPELINE (Python)                         │
│                      Run once after survey closes                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Qualtrics XLSX                                                             │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ scrub_pii.py    │  │ compute_metrics │  │ build_themes.py             │  │
│  │                 │  │                 │  │                             │  │
│  │ • Drop emails   │──│ • PFS scores    │──│ • Gemini embeddings         │  │
│  │ • Remove IPs    │  │ • Segment tabs  │  │ • K-Means clustering        │  │
│  │ • Anonymize     │  │ • n/N format    │  │ • LLM auto-labeling         │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
│           │                   │                       │                     │
│           ▼                   ▼                       ▼                     │
│     clean.csv          metrics.json            themes.json                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DASHBOARD (Next.js 16)                              │
│                    Reads JSON artifacts at build time                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │  StatCards   │  │  Rankings    │  │  Theme       │  │  Evidence      │   │
│  │  (animated)  │  │  (weighted)  │  │  Explorer    │  │  API           │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 16 + React 19 | App Router, Server Components |
| **Styling** | Tailwind CSS | Dark theme, glassmorphism effects |
| **Charts** | Recharts | Interactive data visualization |
| **Data Pipeline** | Python 3.10+ | ETL, embeddings, clustering |
| **ML/NLP** | scikit-learn | K-Means, silhouette scoring |
| **AI** | Gemini API | Embeddings + LLM labeling |
| **Database** | File-based JSON | Version-controlled artifacts |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- [Gemini API key](https://aistudio.google.com/apikey) (free tier works)

### Installation

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/ua-parking-platform.git
cd ua-parking-platform
npm install
pip install -r requirements.txt

# Configure environment
cp .env.example .env.local
# Add your GEMINI_API_KEY to .env.local

# Start development server
npm run dev
```

### Run the Pipeline

```bash
# 1. Clean survey data (removes PII)
python scripts/scrub_pii.py --input data/raw/survey.xlsx --output data/clean.csv

# 2. Compute metrics
python scripts/compute_metrics.py

# 3. Build AI-powered themes
python scripts/build_themes.py -i data/clean.csv -o artifacts/themes.json
```

---

## 📁 Project Structure

```
ua-parking-platform/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Executive dashboard
│   │   ├── evidence/page.tsx     # Theme explorer
│   │   └── api/evidence/         # RESTful evidence API
│   ├── components/
│   │   ├── StatCard.tsx          # Animated metric cards
│   │   ├── RankingsChart.tsx     # Weighted priority visualization
│   │   ├── SegmentChart.tsx      # Cross-tab breakdown
│   │   ├── DistributionPie.tsx   # Category distributions
│   │   └── ThemeExplorer.tsx     # Interactive theme browser
│   └── lib/
│       └── data.ts               # Data loading utilities
├── scripts/
│   ├── scrub_pii.py              # PII removal + anonymization
│   ├── compute_metrics.py        # Aggregations with n/N format
│   ├── build_themes.py           # AI clustering pipeline
│   └── semantic_search.py        # Quote search utility
├── artifacts/
│   ├── metrics.json              # Precomputed dashboard data
│   └── themes.json               # AI-generated theme clusters
├── data/
│   ├── clean.csv                 # Anonymized survey responses
│   └── raw/                      # Original files (gitignored)
└── docs/
    └── data_contract.md          # Schema + PII handling rules
```

---

## � Privacy & Governance

This platform implements **privacy-by-design**:

- ✅ **PII Removal**: Emails, IPs, geolocation scrubbed before processing
- ✅ **Anonymized Quotes**: No identifying information in displayed text
- ✅ **Citation-Backed AI**: All insights link to source quotes
- ✅ **Audit Trail**: Version-controlled JSON artifacts

---

## � Key Metrics Formulas

### Parking Friction Score (PFS)
Weighted composite score (0-1 scale):
```python
PFS = 0.35 * difficulty_score + 0.35 * minutes_norm + 0.30 * skip_score
```

### Weighted Priority Score
For ranking challenges:
```python
Score = 3 × rank1_count + 2 × rank2_count + 1 × rank3_count
```

---

## 🧪 Testing

```bash
# Type checking
npx tsc --noEmit

# Build verification
npm run build

# Development server
npm run dev
```

---

## 📈 Roadmap

- [x] Phase 0: Data pipeline + PII scrubbing
- [x] Phase 1: Interactive dashboard
- [x] Phase 2: AI theme clustering
- [ ] Phase 3: RAG conversational interface
- [ ] Phase 3: PDF brief generator
- [ ] Phase 3: Scenario sensitivity analyzer

---

## 👤 Author

**Karthik Gaur**
- Building data-driven tools for university stakeholders
- Focus: Full-stack development, ML/NLP, product analytics

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.
