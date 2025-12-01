import { StatusEffect, StatType, StoryTurn, RollResult } from '../types';

export const calculateInjury = (hpLoss: number, currentEffects: StatusEffect[]): StatusEffect | null => {
    if (hpLoss <= 0) return null;

    const magnitude = hpLoss > 10 ? -2 : -1;
    const duration = Math.floor(Math.random() * 2) + 1; // 1-2 turns

    // Candidates: STR, DEX, CON
    const candidates: StatType[] = ['STR', 'DEX', 'CON'];
    
    // Filter out stats that already have a negative modifier from an injury
    // We check if any existing debuff affects the candidate stat
    const availableStats = candidates.filter(stat => {
        const hasNegative = currentEffects.some(e => 
            e.type === 'debuff' && e.statModifiers && (e.statModifiers[stat] || 0) < 0
        );
        return !hasNegative;
    });

    if (availableStats.length === 0) {
        // If all are taken, maybe we don't apply a new one, or we overwrite?
        // User said: "If STR already has -1... then only choose between DEX and CON"
        // Implies if all are taken, we stop.
        return null; 
    }

    const targetStat = availableStats[Math.floor(Math.random() * availableStats.length)];

    return {
        id: Math.random().toString(36).substring(7),
        name: magnitude === -1 ? 'Minor Injury' : 'Major Injury',
        description: `Took ${hpLoss} damage. ${targetStat} reduced by ${Math.abs(magnitude)}.`,
        type: 'debuff',
        duration: duration,
        statModifiers: { [targetStat]: magnitude }
    };
};

export const calculateHotStreak = (history: StoryTurn[], currentResult: RollResult): StatusEffect | null => {
    if (!currentResult.isSuccess) return null;

    // Find the last user turn that had a roll
    const lastUserTurnWithRoll = [...history].reverse().find(t => t.isUserTurn && t.rollResult);
    
    if (!lastUserTurnWithRoll || !lastUserTurnWithRoll.rollResult) return null;

    // Check if it matches the current stat and was a success
    if (lastUserTurnWithRoll.rollResult.isSuccess && lastUserTurnWithRoll.rollResult.statType === currentResult.statType) {
        const bonus = Math.random() < 0.5 ? 1 : 2;
        const duration = Math.floor(Math.random() * 2) + 1; // 1-2 turns

        return {
            id: Math.random().toString(36).substring(7),
            name: 'Hot Streak',
            description: `Consecutive successes on ${currentResult.statType}!`,
            type: 'buff',
            duration: duration,
            statModifiers: { [currentResult.statType]: bonus }
        };
    }

    return null;
};
