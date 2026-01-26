'use client';

import { motion } from 'framer-motion';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

interface RankingsChartProps {
    rankings: Record<string, {
        weighted_score: number;
        top3_pct: number;
        total_ranked: number;
    }>;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

export function RankingsChart({ rankings }: RankingsChartProps) {
    const data = Object.entries(rankings).map(([name, stats], index) => ({
        name: name.length > 20 ? name.substring(0, 18) + '...' : name,
        fullName: name,
        score: stats.weighted_score,
        top3Pct: stats.top3_pct,
        color: COLORS[index % COLORS.length],
    }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm"
        >
            <h3 className="text-lg font-semibold text-white mb-4">
                Challenge Priority Rankings
            </h3>
            <p className="text-sm text-gray-400 mb-6">
                Weighted score: 3 pts for Rank 1, 2 pts for Rank 2, 1 pt for Rank 3
            </p>

            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                    >
                        <XAxis type="number" stroke="#6b7280" fontSize={12} />
                        <YAxis
                            type="category"
                            dataKey="name"
                            stroke="#6b7280"
                            fontSize={12}
                            width={140}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#fff',
                            }}
                            formatter={(value, _name, props) => {
                                const payload = props?.payload as { fullName?: string; top3Pct?: number } | undefined;
                                return [
                                    `Score: ${value} | Top 3: ${payload?.top3Pct ?? 0}%`,
                                    payload?.fullName ?? '',
                                ];
                            }}
                        />
                        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
