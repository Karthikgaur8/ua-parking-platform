# Data Contract

This document defines how survey data is processed, what PII is removed, and how quotes are anonymized.

## Source Data

**File:** Qualtrics XLSX export  
**Expected columns:** 44 (see schema below)

## PII Handling

### Columns DROPPED (never stored or processed)

| Column | Reason |
|--------|--------|
| `Q1 A` | Crimson email addresses |
| `IPAddress` | IP addresses |
| `LocationLatitude` | Geolocation |
| `LocationLongitude` | Geolocation |
| `RecipientEmail` | Email addresses |
| `RecipientFirstName` | Names |
| `RecipientLastName` | Names |
| `ExternalReference` | External identifiers |

### Columns KEPT (anonymized)

| Column | New Name | Type | Description |
|--------|----------|------|-------------|
| `ResponseId` | `id` | string | Anonymous response ID (Qualtrics-generated) |
| `StartDate` | `started_at` | datetime | Response start time |
| `EndDate` | `ended_at` | datetime | Response end time |
| `Status` | `status` | string | "IP Address" or "Survey Preview" |
| `Progress` | `progress` | int | Completion percentage |
| `Duration (in seconds)` | `duration_seconds` | int | Time to complete |
| `Finished` | `finished` | bool | Whether survey was completed |
| `Q1 B` | `mode` | string | Transportation mode |
| `Q2` | `frequency` | string | Parking frequency |
| `Q3` | `ease` | string | Ease of finding parking |
| `Q4` | `arrival_time` | string | Usual arrival time |
| `Q5 A_1` | `rank_spots` | int | Rank: Too few spots |
| `Q5 A_2` | `rank_distance` | int | Rank: Distance from classes |
| `Q5 A_3` | `rank_cost` | int | Rank: High cost |
| `Q5 A_4` | `rank_security` | int | Rank: Security concerns |
| `Q5 A_5` | `rank_navigation` | int | Rank: Poor navigation |
| `Q5 A_6` | `rank_other` | int | Rank: Other |
| `Q5 B` | `rank_other_text` | string | Other challenge (text) |
| `Q6` | `minutes_searching` | float | Minutes spent searching |
| `Q7 A` | `skipped_class` | bool | Delayed/skipped due to parking |
| `Q7 B` | `skip_experience` | string | Experience description (text) |
| `Q8` | `pay_to_park_sentiment` | string | Feeling about pay-to-park |
| `Q9` | `crimson_ride_aware` | bool | Aware of PassioGo |
| `Q10` | `crimson_ride_willing` | bool | Would use if accessible |
| `Q11` | `suggestion` | string | One change suggestion (text) |
| `Q12` | `ada_opted_in` | bool | Opted into ADA questions |
| `Q13` | `ada_satisfaction` | string | ADA parking satisfaction |
| `Q14` | `ada_adequate` | string | ADA accommodations adequate |
| `Q15` | `ada_improvement` | string | ADA improvement suggestion (text) |

## Quote Anonymization

Text fields (`skip_experience`, `suggestion`, `rank_other_text`, `ada_improvement`) are processed as follows:

1. **Email detection:** Any email-like patterns are replaced with `[EMAIL]`
2. **Name detection:** Known student names (if any) are replaced with `[NAME]`
3. **Phone detection:** Phone number patterns are replaced with `[PHONE]`
4. **Truncation:** Quotes displayed in dashboard are truncated to 200 characters

## Pipeline Validation

Before `clean.csv` is created, the script validates:

1. All PII columns are dropped
2. No email patterns exist in text fields
3. Response count matches expected (after filtering previews)

## Artifact Outputs

| File | Contains PII? | Committed? |
|------|---------------|------------|
| `data/raw/*.xlsx` | Yes | ❌ Never |
| `data/clean.csv` | No (scrubbed) | ❌ By default |
| `artifacts/metrics.json` | No (aggregates) | ✅ Yes |
| `artifacts/themes.json` | No (anonymized quotes) | ✅ Yes |
| `artifacts/rankings.json` | No (aggregates) | ✅ Yes |
| `artifacts/brief.pdf` | Maybe (quotes) | ❌ Requires approval |

## Compliance

This data handling follows:
- FERPA guidelines for educational records
- University data governance policies
- Privacy-by-design principles
