
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
    },
    {
        title: "Natural Talent",
        description: "Roll a Natural 20 on any check.",
        type: 'natural_20',
        targetRange: [1, 1],
        reward: 'heroic_refill'
    },
    {
        title: "By a Thread",
        description: "Succeed on a check by exactly matching the DC or by 1 point.",
        type: 'close_call',
        targetRange: [1, 1],
        reward: 'reroll_token'
    },
    {
        title: "Fully Kitted",
        description: "Have a Weapon, Armor, and Accessory equipped simultaneously.",
        type: 'fully_equipped',
        targetRange: [1, 1],
        reward: 'max_hp_boost',
        rewardValue: 10
    },
    {
        title: "Legendary Feat",
        description: "Succeed on {target} difficult checks (DC 15+).",
        type: 'any_success_roll', // We can reuse this type but filter in check logic if we wanted, but for now let's keep it simple or add a new type. 
        // Actually let's stick to simple types for now.
        // Let's use 'any_success_roll' but with higher target for a legendary item
        targetRange: [4, 5],
        reward: 'legendary_item'
    },
    {
        title: "Weapon Master",
        description: "Succeed on {target} checks using your main stat.",
        type: 'stat_success_count', // Will need to infer main stat dynamically? Or just random stat.
        // Let's just use random stat templates for this.
        targetRange: [3, 4],
        reward: 'upgrade_equipped'
    },
    {
        title: "Gambler's Challenge",
        description: "Succeed on {target} risky checks (Chance < 50%).",
        type: 'any_success_roll', // Simplified for now, ideally check risk
        targetRange: [2, 3],
        reward: 'reroll_token',
        rewardValue: 1
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
        title: `${stat} Training`,
        description: `Succeed on {target} ${stat} checks.`,
        type: 'stat_success_count',
        targetRange: [2, 3],
        reward: 'stat_boost',
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
            status: 'available'
        };
        
        newQuests.push(quest);
        existingTitles.add(quest.title); // Add to set to prevent duplicate in same batch
    }

    return [...currentQuests, ...newQuests];
};

export const checkQuestProgress = (
    gameState: GameState, 
    lastTurn: StoryTurn
): { updatedQuests: SideQuest[] } => {
    
    const updatedQuests = gameState.activeSideQuests.map(quest => {
        if (quest.status !== 'active') return quest; 

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

            case 'natural_20':
                if (lastTurn.rollResult && lastTurn.rollResult.base === 20) {
                    newProgress = quest.target;
                }
                break;

            case 'close_call':
                if (lastTurn.rollResult && lastTurn.rollResult.isSuccess) {
                    const diff = lastTurn.rollResult.total - lastTurn.rollResult.difficulty;
                    if (diff === 0 || diff === 1) {
                        newProgress += 1;
                    }
                }
                break;

            case 'fully_equipped':
                if (gameState.equipped.weapon && gameState.equipped.armor && gameState.equipped.accessory) {
                    newProgress = quest.target;
                } else {
                    newProgress = 0;
                }
                break;
            
            case 'turn_count':
                newProgress += 1;
                break;

            case 'hp_threshold':
                if (gameState.hp < (gameState.maxHp * 0.5)) {
                    newProgress += 1;
                } else {
                    newProgress = 0;
                }
                break;

            case 'inventory_count':
                newProgress = gameState.inventory.length;
                break;
        }

        if (newProgress >= quest.target) {
            completed = true;
        }

        if (completed) {
            return { ...quest, progress: newProgress, status: 'completed' as const };
        }

        return { ...quest, progress: newProgress };
    });

    return { updatedQuests };
};
