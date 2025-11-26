
export type StatType = 'STR' | 'DEX' | 'CON' | 'INT' | 'CHA' | 'PER';
export type ItemType = 'weapon' | 'armor' | 'accessory' | 'misc';

export interface CharacterStats {
  STR: number;
  DEX: number;
  CON: number;
  INT: number;
  CHA: number;
  PER: number;
}

export type StatExperience = Record<StatType, number>;

export interface LevelUpEvent {
  stat: StatType;
  oldValue: number;
  newValue: number;
  isSpecialEvent?: boolean; // New flag for instant boosts
}

export interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  description?: string;
  bonuses?: Partial<CharacterStats>;
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
export type GamePhase = 'menu' | 'setup_genre' | 'setup_stats' | 'playing' | 'game_over';

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
  gameStatus: GameStatus;
  phase: GamePhase;
  genre: string;
  stats: CharacterStats;
  statExperience: StatExperience; // Tracks usage for leveling
  activeEffects: StatusEffect[];
  startingStats: CharacterStats; // To compare at the end
  finalSummary?: string; // AI generated summary
  finalStoryboard?: string; // The 10-panel comic image
  customChoicesRemaining: number; // Limit 3 per game
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
    bonuses?: Partial<CharacterStats>; 
  }[];
  inventory_removed?: string[];
  equipment_update?: {
    equip?: string[];   // Names of items to equip from inventory
    unequip?: string[]; // Names of items to unequip to inventory
  };
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
}

export enum ImageSize {
  Size_1K = "1K",
  Size_2K = "2K",
  Size_4K = "4K",
}

export enum StoryModel {
  Smart = "gemini-3-pro-preview",
  Fast = "gemini-2.5-flash",
  LocalQwen = "qwen3:8b",
  LocalGemma = "gemma3:27b",
  LocalQwenCoder = "qwen3-coder:30b",
}

export enum UIScale {
  Compact = 0.85,
  Normal = 1,
  Large = 1.15
}

export interface AppSettings {
  imageSize: ImageSize;
  storyModel: StoryModel;
  uiScale: UIScale;
}

export interface SaveData {
  gameState: GameState;
  currentChoices: ChoiceData[];
  settings: AppSettings;
  timestamp: number;
  version: string;
}
