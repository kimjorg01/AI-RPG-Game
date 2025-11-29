
import { SideQuest, QuestType, QuestRewardType, GameState, StoryTurn, StatType, InventoryItem } from '../types';
import { createItemFromString } from './itemFactory';

interface QuestTemplate {
    title: string;
    description: string;
    type: QuestType;
    targetRange: [number, number];
    reward: QuestRewardType;
    rewardValue?: number;
    statTarget?: StatType;
}

const BASE_TEMPLATES: QuestTemplate[] = [
    {
        title: "Lucky Streak",
        description: "Succeed on {target} dice rolls in a row.",
        type: 'roll_streak',
        targetRange: [2, 3],
        reward: 'level_up'
    },
    {
        title: "Survivor",
        description: "Survive {target} turns with less than 50% HP.",
        type: 'hp_threshold',
        targetRange: [2, 3],
        reward: 'heal_hp',
        rewardValue: 25
    },
    {
        title: "Hoarder",
        description: "Have {target} items in your inventory.",
        type: 'inventory_count',
        targetRange: [3, 5],
        reward: 'restore_custom_choice',
        rewardValue: 1
    },
    {
        title: "Veteran",
        description: "Complete {target} turns in this adventure.",
        type: 'turn_count',
        targetRange: [3, 5],
        reward: 'level_up'
    },
    {
        title: "Skill Master",
        description: "Succeed on {target} skill checks of any kind.",
        type: 'any_success_roll',
        targetRange: [2, 4],
        reward: 'level_up'
    }
];

const STAT_REWARD_NAMES: Record<StatType, string[]> = {
    STR: ["Heavy Greatsword", "Giant's Club", "Titan's Maul", "Warrior's Axe"],
    DEX: ["Swift Dagger", "Assassin's Bow", "Thief's Blade", "Ninja's Shuriken"],
    CON: ["Plate Armor", "Vitality Shield", "Iron Helm", "Guardian's Vest"],
    INT: ["Arcane Staff", "Wizard's Tome", "Crystal Orb", "Mage's Robe"],
    CHA: ["Golden Crown", "Royal Scepter", "Noble's Ring", "Diplomat's Badge"],
    PER: ["Sniper Rifle", "Eagle Eye Goggles", "Scout's Scope", "Hunter's Bow"],
    LUK: ["Lucky Coin", "Gambler's Dice", "Rabbit's Foot", "Chaos Charm"]
};

const generateStatTemplates = (): QuestTemplate[] => {
    const stats: StatType[] = ['STR', 'DEX', 'CON', 'INT', 'CHA', 'PER', 'LUK'];
    return stats.map(stat => ({
        title: `${stat} Mastery`,
        description: `Succeed on {target} ${stat} checks.`,
        type: 'stat_success_count',
        targetRange: [2, 3],
        reward: 'item',
        statTarget: stat
    }));
};

const getAllTemplates = () => [...BASE_TEMPLATES, ...generateStatTemplates()];

export const generateSideQuests = (currentQuests: SideQuest[]): SideQuest[] => {
    const needed = 3 - currentQuests.length;
    if (needed <= 0) return currentQuests;

    const newQuests: SideQuest[] = [];
    const allTemplates = getAllTemplates();
    
    // Avoid duplicates
    const existingTitles = new Set(currentQuests.map(q => q.title));

    for (let i = 0; i < needed; i++) {
        // Filter out templates that already exist in current quests or new quests being added
        const availableTemplates = allTemplates.filter(t => !existingTitles.has(t.title));
        
        if (availableTemplates.length === 0) break; // No more unique quests available

        const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
        const target = Math.floor(Math.random() * (template.targetRange[1] - template.targetRange[0] + 1)) + template.targetRange[0];
        
        // Generate Reward Item if needed
        let rewardItem: InventoryItem | undefined = undefined;
        if (template.reward === 'item' && template.statTarget) {
            const possibleNames = STAT_REWARD_NAMES[template.statTarget];
            const name = possibleNames[Math.floor(Math.random() * possibleNames.length)];
            rewardItem = createItemFromString(name);
            // Ensure it has a unique ID
            rewardItem.id = Math.random().toString(36).substring(7);
            rewardItem.description = `A reward for mastering ${template.statTarget}.`;
        }

        const quest: SideQuest = {
            id: Math.random().toString(36).substring(7),
            title: template.title,
            description: template.description.replace('{target}', target.toString()),
            type: template.type,
            target: target,
            progress: 0,
            reward: template.reward,
            rewardValue: template.rewardValue,
            statTarget: template.statTarget,
            rewardItem: rewardItem,
            isCompleted: false
        };
        
        newQuests.push(quest);
        existingTitles.add(quest.title); // Add to set to prevent duplicate in same batch
    }

    return [...currentQuests, ...newQuests];
};

export const checkQuestProgress = (
    gameState: GameState, 
    lastTurn: StoryTurn
): { updatedQuests: SideQuest[], rewards: { type: QuestRewardType, value?: number, item?: InventoryItem }[] } => {
    
    const rewards: { type: QuestRewardType, value?: number, item?: InventoryItem }[] = [];
    
    const updatedQuests = gameState.activeSideQuests.map(quest => {
        if (quest.isCompleted) return quest; 

        let newProgress = quest.progress;
        let completed = false;

        switch (quest.type) {
            case 'roll_streak':
                if (lastTurn.rollResult) {
                    if (lastTurn.rollResult.isSuccess) {
                        newProgress += 1;
                    } else {
                        newProgress = 0; // Reset streak on failure
                    }
                }
                break;
            
            case 'any_success_roll':
                if (lastTurn.rollResult && lastTurn.rollResult.isSuccess) {
                    newProgress += 1;
                }
                break;

            case 'stat_success_count':
                if (lastTurn.rollResult && lastTurn.rollResult.isSuccess && lastTurn.rollResult.statType === quest.statTarget) {
                    newProgress += 1;
                }
                break;

            case 'turn_count':
                newProgress += 1;
                break;

            case 'hp_threshold':
                if (gameState.hp < (gameState.maxHp / 2)) {
                    newProgress += 1;
                }
                break;

            case 'inventory_count':
                newProgress = gameState.inventory.length;
                break;
        }

        if (newProgress >= quest.target) {
            completed = true;
            newProgress = quest.target;
            rewards.push({ 
                type: quest.reward, 
                value: quest.rewardValue,
                item: quest.rewardItem
            });
        }

        return {
            ...quest,
            progress: newProgress,
            isCompleted: completed
        };
    });

    return { updatedQuests, rewards };
};
