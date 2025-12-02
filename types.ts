
export type StatType = 'STR' | 'DEX' | 'CON' | 'INT' | 'CHA' | 'PER' | 'LUK';
export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'misc';

export interface CharacterStats {
  STR: number;
  DEX: number;
  CON: number;
  INT: number;
  CHA: number;
  PER: number;
  LUK: number;
}

export type StatExperience = Record<StatType, number>;

export interface LevelUpEvent {
  stat: StatType;
  oldValue: number;
  newValue: number;
  isSpecialEvent?: boolean; // New flag for instant boosts
}

export interface ConsumableEffect {
    type: 'heal' | 'stat_boost';
    value: number; // HP amount or Stat amount
    stat?: StatType; // For stat_boost
    duration?: number; // For stat_boost (0 or undefined = instant/permanent? No, usually temporary)
    penaltyStat?: StatType; // For trade-offs (e.g. +2 STR, -1 INT)
    penaltyValue?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  description?: string;
  bonuses?: Partial<CharacterStats>;
  consumableEffect?: ConsumableEffect;
}

export interface EquippedGear {
  weapon: InventoryItem | null;
  armor: InventoryItem | null;
  accessory: InventoryItem | null;
}

export interface StatusEffect {
  id: string;
  name: string;
  description: string;
  type: 'buff' | 'debuff';
  duration: number; // Turns remaining
  statModifiers?: Partial<CharacterStats>;
  blocksHeroicActions?: boolean;
}

export type GameStatus = 'ongoing' | 'won' | 'lost';
export type GamePhase = 'menu' | 'setup_genre' | 'setup_stats' | 'creating_world' | 'playing' | 'game_over';

export interface MainQuest {
    id: string;
    title: string;
    description: string;
    status: 'active' | 'completed' | 'pending';
    turnCount?: number;
}

export interface MainStoryArc {
    campaignTitle: string;
    backgroundLore: string;
    mainQuests: MainQuest[];
    finalObjective: string;
}

export interface ChoiceData {
  text: string;
  type?: StatType; // If undefined, no check needed
  difficulty?: number; // DC (Difficulty Class)
}

export interface RollResult {
  total: number;
  base: number;
  modifier: number;
  isSuccess: boolean;
  statType: StatType;
  difficulty: number;
}

export type QuestType = 'roll_streak' | 'turn_count' | 'hp_threshold' | 'stat_check_count' | 'inventory_count' | 'any_success_roll' | 'stat_success_count' | 'natural_20' | 'close_call' | 'fully_equipped';
export type QuestRewardType = 'level_up' | 'heal_hp' | 'restore_custom_choice' | 'item' | 'max_hp_boost' | 'reroll_token' | 'upgrade_equipped' | 'legendary_item' | 'heroic_refill' | 'stat_boost';

export interface SideQuest {
    id: string;
    title: string;
    description: string;
    type: QuestType;
    target: number;
    progress: number;
    reward: QuestRewardType;
    rewardValue?: number;
    statTarget?: StatType; 
    rewardItem?: InventoryItem;
    status: 'available' | 'active' | 'completed';
}

export type GameLength = 'short' | 'medium' | 'long';

export interface GameState {
  inventory: InventoryItem[];
  equipped: EquippedGear;
  currentQuest: string;
  history: StoryTurn[];
  isLoading: boolean;
  isRolling: boolean;
  hp: number;
  maxHp: number;
  hpHistory: number[]; // For the graph
  statHistory: CharacterStats[]; // For the graph
  gameStatus: GameStatus;
  phase: GamePhase;
  genre: string;
  gameLength: GameLength;
  stats: CharacterStats;
  statExperience: StatExperience; // Tracks usage for leveling
  activeEffects: StatusEffect[];
  startingStats: CharacterStats; // To compare at the end
  finalSummary?: string; // AI generated summary
  finalStoryboard?: string; // The 10-panel comic image
  customChoicesRemaining: number; // Limit 3 per game
  mainStoryArc?: MainStoryArc;
  activeSideQuests: SideQuest[];
  pendingLevelUps: number;
  rerollTokens: number;
}

export interface StoryTurn {
  id: string;
  text: string;
  // imageUrl removed for per-turn, technically legacy, but kept in type if old saves load
  imageUrl?: string; 
  imagePrompt?: string;
  choices: ChoiceData[];
  isUserTurn?: boolean;
  rollResult?: RollResult;
  levelUpEvent?: LevelUpEvent; // Notification for UI
  inventoryAdded?: InventoryItem[];
  inventoryRemoved?: string[];
  newEffects?: StatusEffect[];
}

export interface AIStoryResponse {
  narrative: string;
  choices: ChoiceData[];
  inventory_added?: { 
    name: string; 
    type: ItemType; 
    description?: string; 
  }[];
  inventory_removed?: string[];
  quest_update?: string;
  visual_prompt?: string;
  hp_change?: number;
  game_status?: GameStatus;
  new_effects?: StatusEffect[];
  action_result?: { // For Custom Choices
      stat: StatType;
      difficulty: number;
      base_roll: number;
      total: number;
      is_success: boolean;
  };
  act_completed?: boolean;
}

export enum ImageSize {
  Size_1K = "1K",
  Size_2K = "2K",
  Size_4K = "4K",
}

export enum StoryModel {
  Smart = "gemini-3-pro-preview",
  SmartLowThinking = "gemini-3-pro-preview-low",
  Pro25 = "gemini-2.5-pro",
  Fast = "gemini-2.5-flash",
  LocalQwen = "qwen3:8b",
  LocalGemma = "gemma3:27b",
  LocalQwenCoder = "qwen3-coder:30b",
}

export type UIScale = number;

export interface AppSettings {
  imageSize: ImageSize;
  storyModel: StoryModel;
  uiScale: UIScale;
  enableDiceRolls: boolean;
}

export interface SaveData {
  gameState: GameState;
  currentChoices: ChoiceData[];
  settings: AppSettings;
  timestamp: number;
  version: string;
}
