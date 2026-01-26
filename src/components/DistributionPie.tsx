'use client';

import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DistributionPieProps {
    title: string;
    data: Record<string, number>;
    colorScheme?: 'difficulty' | 'sentiment' | 'default';
}

const DIFFICULTY_COLORS: Record<string, string> = {
    'Very Easy': '#22c55e',
    'Easy': '#84cc16',
    'Neutral': '#eab308',
    'Difficult': '#f97316',
    'Very Difficult': '#ef4444',
};

const DEFAULT_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e', '#eab308'];

export function DistributionPie({ title, data, colorScheme = 'default' }: DistributionPieProps) {
    const chartData = Object.entries(data)
        .filter(([key]) => !['total'].includes(key.toLowerCase()))
        .map(([name, value], index) => ({
            name,
            value,
            color: colorScheme === 'difficulty'
                ? DIFFICULTY_COLORS[name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
                : DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        }))
        .sort((a, b) => b.value - a.value);

    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm"
        >
            <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>

            <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#fff',
                            }}
                            formatter={(value) => {
                                const numValue = Number(value) || 0;
                                return [`${numValue} (${((numValue / total) * 100).toFixed(1)}%)`];
                            }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value) => (
                                <span className="text-gray-300 text-sm">{String(value)}</span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
