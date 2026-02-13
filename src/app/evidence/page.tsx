'use client';

import React, { useState, useEffect } from 'react';
import ThemeExplorer from '@/components/ThemeExplorer';
import NavHeader from '@/components/NavHeader';

interface Theme {
    id: number;
    label: string;
    count: number;
    pct: number;
    quotes: string[];
    segments?: {
        by_arrival_time: Record<string, number>;
        by_mode: Record<string, number>;
        skip_rate: number | null;
    };
}

interface ThemesResponse {
    metadata: {
        generated_at: string;
        total_texts: number;
        n_clusters: number;
    };
    themes: Theme[];
}

// Mock data for development
const mockThemes: Theme[] = [
    {
        id: 0,
        label: 'Need More Spots',
        count: 87,
        pct: 32.1,
        quotes: [
            'There are simply not enough parking spots for the number of students who need them.',
            'Build more parking decks. The current capacity is nowhere near what we need.',
            'Adding more spaces near the engineering building would help tremendously.',
            'We need at least 2-3 more parking structures to meet demand.',
            'Expand existing lots - there is unused green space that could be paved.',
        ],
    },
    {
        id: 1,
        label: 'Cost Concerns',
        count: 64,
        pct: 23.6,
        quotes: [
            'The parking pass is way too expensive for students who are already paying tuition.',
            'I pay $600 for a pass but can never find a spot. What am I paying for?',
            'Reduce the cost of permits or offer sliding scale based on financial need.',
            'Its ridiculous that we pay so much and still have to hunt for parking.',
            'Make parking free for students - we already pay enough in fees.',
        ],
    },
    {
        id: 2,
        label: 'Distance from Classes',
        count: 52,
        pct: 19.2,
        quotes: [
            'The only spots available are a 15 minute walk from my classes.',
            'By the time I get from the parking deck to class, Im already exhausted.',
            'Need more parking closer to academic buildings, not just at the edges.',
            'Walking from the rec center lot in summer heat is dangerous.',
            'The shuttle doesnt run often enough to help with the distance issue.',
        ],
    },
    {
        id: 3,
        label: 'Peak Time Issues',
        count: 38,
        pct: 14.0,
        quotes: [
            'If you arrive after 9am, forget about finding a spot anywhere.',
            'The 10am-12pm window is impossible. I have to arrive at 7:30 for a 10am class.',
            'Stagger class times so not everyone is trying to park at once.',
            'Morning rush hour is chaos - need better flow management.',
            'Reserve some spots for late arrivers who have afternoon classes.',
        ],
    },
    {
        id: 4,
        label: 'Navigation & Signage',
        count: 30,
        pct: 11.1,
        quotes: [
            'Add digital signs showing available spots in each deck level.',
            'The lots are confusing - better signage would help new students.',
            'An app showing real-time availability would save so much time.',
            'I waste 10 minutes just driving around looking for open spots.',
            'Color code the decks and add clear directional signs.',
        ],
    },
];

export default function EvidencePage() {
    const [themes, setThemes] = useState<Theme[]>(mockThemes);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<ThemesResponse['metadata'] | null>(null);

    useEffect(() => {
        async function loadThemes() {
            try {
                const res = await fetch('/api/evidence');
                if (!res.ok) throw new Error('Failed to load themes');

                const data: ThemesResponse = await res.json();

                if (data.themes && data.themes.length > 0) {
                    // Fetch full details for each theme
                    const fullThemes = await Promise.all(
                        data.themes.map(async (t) => {
                            const detailRes = await fetch(`/api/evidence?theme=${t.id}`);
                            return detailRes.ok ? await detailRes.json() : t;
                        })
                    );
                    setThemes(fullThemes);
                    setMetadata(data.metadata);
                }
                // If no themes from API, keep mock data
            } catch (err) {
                console.log('Using mock data:', err);
                // Keep mock data on error
            } finally {
                setLoading(false);
            }
        }

        loadThemes();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <NavHeader subtitle="Evidence Engine" />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Page Title */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        Evidence Engine
                    </h1>
                    <p className="text-white/60 max-w-2xl">
                        AI-powered theme clustering from {metadata?.total_texts || 271} student comments.
                        Each theme includes representative quotes as "receipts" for decision-making.
                    </p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="text-2xl font-bold text-white">{themes.length}</div>
                        <div className="text-sm text-white/50">Themes Identified</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="text-2xl font-bold text-white">
                            {themes.reduce((sum, t) => sum + t.count, 0)}
                        </div>
                        <div className="text-sm text-white/50">Total Comments</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="text-2xl font-bold text-white">
                            {themes.reduce((sum, t) => sum + t.quotes.length, 0)}
                        </div>
                        <div className="text-sm text-white/50">Representative Quotes</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="text-2xl font-bold text-emerald-400">Ready</div>
                        <div className="text-sm text-white/50">For Analysis</div>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full" />
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {/* Theme Explorer */}
                {!loading && <ThemeExplorer themes={themes} />}

                {/* Methodology Note */}
                <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-violet-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Methodology
                    </h3>
                    <p className="text-white/60 text-sm leading-relaxed">
                        Themes are identified using K-Means clustering on text embeddings generated by
                        Google's Gemini text-embedding-004 model. Cluster labels are auto-generated via
                        LLM summarization. Representative quotes are selected based on proximity to
                        cluster centroids, ensuring they best represent each theme's core sentiment.
                    </p>
                </div>
            </main>
        </div>
    );
}
