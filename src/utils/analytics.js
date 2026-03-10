import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge tailwind classes
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Analytics utility functions for sports data
 */

export const calculateTrend = (data) => {
    if (!data || data.length < 2) return 0;
    const recent = data[data.length - 1];
    const previous = data[data.length - 2];
    return ((recent - previous) / previous) * 100;
};

export const getStatusColor = (risk) => {
    if (risk > 60) return 'text-red-500';
    if (risk > 30) return 'text-yellow-500';
    return 'text-green-500';
};

export const getStatusBg = (risk) => {
    if (risk > 60) return 'border-red-500/50 bg-red-500/5';
    if (risk > 30) return 'border-yellow-500/50 bg-yellow-500/5';
    return 'border-green-500/50 bg-green-500/5';
};

// Advanced Metrics
export const calculateImpactScore = (player) => {
    const base = (player.battingAvg || 0) + (100 - (player.bowlingAvg || 100)) + (player.goals || 0) * 2;
    const performances = player.last5Performances || player.last5Matches;
    let form = 50;
    if (performances && performances.length > 0) {
        const avg = performances.reduce((a, b) => a + b, 0) / performances.length;
        // If values are small (like football goals), scale them up
        form = avg < 5 ? avg * 20 : avg;
    }
    return Math.min(100, Math.floor((base + form) / 2.5));
};

export const calculateClutchScore = (player) => {
    // Simulated clutch score based on role and experience
    let score = 60;
    if (player.matchesPlayed > 100) score += 15;
    if (player.role === 'All-Rounder' || player.position === 'Midfielder') score += 10;
    return Math.min(100, score);
};

export const calculateConsistencyIndex = (player) => {
    if (!player.last5Performances && !player.last5Matches) return 70;
    const data = player.last5Performances || player.last5Matches;
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / data.length;
    return Math.max(0, Math.min(100, 100 - Math.sqrt(variance)));
};

export const formatPercent = (val) => `${Math.round(val)}%`;
