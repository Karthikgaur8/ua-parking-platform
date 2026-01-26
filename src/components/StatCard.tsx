'use client';

import { motion } from 'framer-motion';

interface StatCardProps {
    title: string;
    value: string;
    subtitle: string;
    trend?: 'up' | 'down' | 'neutral';
    color?: 'red' | 'amber' | 'green' | 'blue';
}

const colorClasses = {
    red: 'from-red-500/20 to-red-600/10 border-red-500/30',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
};

const textColors = {
    red: 'text-red-400',
    amber: 'text-amber-400',
    green: 'text-green-400',
    blue: 'text-blue-400',
};

export function StatCard({ title, value, subtitle, color = 'blue' }: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`
        relative overflow-hidden rounded-2xl border p-6
        bg-gradient-to-br ${colorClasses[color]}
        backdrop-blur-sm
      `}
        >
            <div className="relative z-10">
                <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                    {title}
                </p>
                <p className={`text-4xl font-bold ${textColors[color]} mb-1`}>
                    {value}
                </p>
                <p className="text-sm text-gray-500">
                    {subtitle}
                </p>
            </div>

            {/* Decorative gradient orb */}
            <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-gradient-to-br ${colorClasses[color]} opacity-50 blur-2xl`} />
        </motion.div>
    );
}
