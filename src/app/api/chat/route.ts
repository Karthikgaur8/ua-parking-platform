/**
 * RAG Chat API Endpoint (Keyword-based Search)
 * 
 * POST /api/chat
 *   Body: { message: string, history?: Message[] }
 *   Returns: AI response with relevant survey quotes
 * 
 * Uses keyword matching on themes.json quotes instead of semantic embeddings
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

interface Document {
    id: string;
    text: string;
    source: string;
    arrival_time: string;
    mode: string;
}

interface Theme {
    id: number;
    label: string;
    count: number;
    pct: number;
    quotes: string[];
    segments: {
        by_arrival_time: Record<string, number>;
        by_mode: Record<string, number>;
    };
}

interface ThemesData {
    metadata: {
        total_texts: number;
        n_clusters: number;
    };
    themes: Theme[];
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

// Load themes data at startup
let themesData: ThemesData | null = null;

function loadThemesData(): ThemesData {
    if (themesData) return themesData;

    const themesPath = path.join(process.cwd(), 'artifacts', 'themes.json');

    if (!fs.existsSync(themesPath)) {
        throw new Error('Themes data not found. Run: python scripts/build_themes.py');
    }

    const data = fs.readFileSync(themesPath, 'utf-8');
    themesData = JSON.parse(data);
    console.log(`Loaded ${themesData!.themes.length} themes for RAG`);
    return themesData!;
}

// Simple keyword-based relevance scoring
function scoreDocument(text: string, query: string): number {
    const textLower = text.toLowerCase();
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    let score = 0;
    for (const word of queryWords) {
        if (textLower.includes(word)) {
            score += 1;
            // Bonus for exact word match
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            const matches = textLower.match(regex);
            if (matches) score += matches.length * 0.5;
        }
    }

    return score;
}

// Find most relevant quotes using keyword matching
function findRelevantDocs(
    query: string,
    themes: ThemesData,
    topK: number = 5
): Document[] {
    const allDocs: (Document & { score: number })[] = [];

    // Extract all quotes with metadata
    for (const theme of themes.themes) {
        for (let i = 0; i < theme.quotes.length; i++) {
            const quote = theme.quotes[i];
            const score = scoreDocument(quote, query);

            // Also check if theme label matches query
            const labelScore = scoreDocument(theme.label, query) * 2;

            allDocs.push({
                id: `${theme.id}_${i}`,
                text: quote,
                source: theme.label,
                arrival_time: Object.keys(theme.segments.by_arrival_time)[0] || 'Unknown',
                mode: Object.keys(theme.segments.by_mode)[0] || 'Unknown',
                score: score + labelScore,
            });
        }
    }

    // Sort by score and return top K
    allDocs.sort((a, b) => b.score - a.score);
    return allDocs.slice(0, topK);
}

// Build context from relevant documents
function buildContext(docs: Document[]): string {
    if (docs.length === 0) return 'No relevant survey responses found.';

    return docs.map((doc, i) => {
        return `[Quote ${i + 1}] (Theme: ${doc.source}):
"${doc.text}"`;
    }).join('\n\n');
}

export async function POST(request: NextRequest) {
    try {
        const { message, history = [] } = await request.json();

        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        // Load themes data
        const themes = loadThemesData();

        // Find relevant documents using keyword search
        const relevantDocs = findRelevantDocs(message, themes, 5);
        const context = buildContext(relevantDocs);

        // Initialize Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY not found in environment');
            return NextResponse.json(
                { error: 'Server configuration error: API key not set' },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // gemini-2.0-flash is fast and cost-effective
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });

        // Build the prompt with RAG context
        const prompt = `You are a data analyst assistant for University of Alabama parking survey data.

SURVEY THEMES (by response count):
${themes.themes.map(t => `• ${t.label}: ${t.count} responses (${t.pct}%)`).join('\n')}

RELEVANT STUDENT QUOTES:
${context}

USER QUESTION: ${message}

Instructions:
- Provide a concise, data-driven answer (2-3 sentences max)
- Reference specific quotes using [Quote X] format when relevant
- If the data doesn't cover the topic, say so honestly`;

        // Single attempt for paid tier (rate limits not an issue)
        try {
            const result = await model.generateContent(prompt);
            const response = result.response.text();

            return NextResponse.json({
                response,
                sources: relevantDocs.map(d => ({
                    id: d.id,
                    text: d.text.slice(0, 200) + (d.text.length > 200 ? '...' : ''),
                    source: d.source,
                    arrival_time: d.arrival_time,
                    mode: d.mode,
                })),
            });
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error('Gemini API error:', errorMsg);

            // Return helpful error to user
            return NextResponse.json({
                error: 'Unable to generate response. Please try again.',
                details: process.env.NODE_ENV === 'development' ? errorMsg : undefined,
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Chat API error details:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: `Failed to process chat request: ${errorMessage}` },
            { status: 500 }
        );
    }
}
