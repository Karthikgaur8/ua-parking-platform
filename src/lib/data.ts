import fs from 'fs';
import path from 'path';

export interface Metrics {
    metadata: {
        generated_at: string;
        input_file: string;
        total_rows: number;
    };
    metrics: {
        total_responses: { n: number; completed: number };
        mode_distribution: { counts: Record<string, number>; total: number };
        frequency_distribution: { counts: Record<string, number>; total: number };
        ease_distribution: {
            counts: Record<string, number>;
            total: number;
            difficult_rate: { n: number; N: number; pct: number };
        };
        arrival_distribution: { counts: Record<string, number>; total: number };
        skip_rate: { n: number; N: number; pct: number };
        minutes_searching: { mean: number; median: number; min: number; max: number; n: number };
        pay_to_park_sentiment: { counts: Record<string, number>; total: number };
        crimson_ride_awareness: { n: number; N: number; pct: number };
        crimson_ride_willingness: { n: number; N: number; pct: number };
    };
    rankings: Record<string, {
        rank_counts: Record<number, number>;
        weighted_score: number;
        top3_count: number;
        top3_pct: number;
        total_ranked: number;
    }>;
    segments: {
        by_arrival_time: Record<string, { n: number; avg_pfs: number; skip_rate: number; avg_minutes: number }>;
        by_mode: Record<string, { n: number; avg_pfs: number; skip_rate: number }>;
        by_frequency: Record<string, { n: number; avg_pfs: number; skip_rate: number }>;
    };
    ada: {
        opted_in: number;
        satisfaction: { counts: Record<string, number>; total: number };
        adequacy: { counts: Record<string, number>; total: number };
    };
}

export async function getMetrics(): Promise<Metrics> {
    const filePath = path.join(process.cwd(), 'artifacts', 'metrics.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContents);
}
