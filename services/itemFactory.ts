
import { InventoryItem, ItemType, CharacterStats } from "../types";

const generateId = () => Math.random().toString(36).substring(2, 9);

export const createItemFromString = (name: string): InventoryItem => {
  const lowerName = name.toLowerCase();
  let type: ItemType = 'misc';
  let bonuses: Partial<CharacterStats> = {};

  // --- 1. DETERMINE TYPE ---

  // Weapons: Medieval, Modern, Improvised
  if (lowerName.match(/sword|axe|dagger|blade|spear|mace|hammer|bow|staff|wand|pipe|bar|club|stick|rock|stone|brick|shiv|knife|glass|shard|wrench|crowbar|bat|pistol|rifle|gun|blaster|saber|claws/)) {
    type = 'weapon';
  } 
  // Armor: Medieval, Modern, Clothing
  else if (lowerName.match(/shield|armor|mail|plate|helmet|robe|cloak|vest|jacket|coat|shirt|tunic|boots|gloves|bracers|pants|greaves|suit|garb/)) {
    type = 'armor';
  } 
  // Accessories: Jewelry, Tech, Magic
  else if (lowerName.match(/ring|amulet|necklace|charm|gem|stone|talisman|watch|goggles|glasses|monocle|crown|tiara|belt|scarf|pendant|orb|device|gadget/)) {
    type = 'accessory';
  }

  // --- 2. ASSIGN STATS BASED ON KEYWORDS ---
  
  if (type === 'weapon') {
    // Heavy / Blunt -> STR
    if (lowerName.match(/heavy|great|hammer|axe|mace|club|pipe|bar|wrench|crowbar|bat|rock|brick/)) {
      bonuses.STR = (bonuses.STR || 0) + 2;
    } 
    // Finesse / Ranged -> DEX
    else if (lowerName.match(/dagger|bow|rapier|knife|shiv|spear|pistol|rifle|gun|blaster/)) {
      bonuses.DEX = (bonuses.DEX || 0) + 2;
    } 
    // Magic -> INT
    else if (lowerName.match(/staff|wand|tome|saber/)) {
      bonuses.INT = (bonuses.INT || 0) + 2;
    } 
    // Default Weapon (Sword, etc) -> STR
    else {
      bonuses.STR = (bonuses.STR || 0) + 1;
    }
  } 
  
  else if (type === 'armor') {
    // Heavy / Metal -> CON
    if (lowerName.match(/plate|heavy|mail|metal|riot/)) {
      bonuses.CON = (bonuses.CON || 0) + 2;
      bonuses.DEX = (bonuses.DEX || 0) - 1; // Heavy armor penalty
    } 
    // Magic / Robes -> INT
    else if (lowerName.match(/robe|cloak|wizard|mage/)) {
      bonuses.INT = (bonuses.INT || 0) + 1;
      bonuses.CON = (bonuses.CON || 0) + 1;
    } 
    // Light / Clothing -> DEX/CON
    else {
      bonuses.CON = (bonuses.CON || 0) + 1;
    }
  } 
  
  else if (type === 'accessory') {
    if (lowerName.match(/strength|power|muscle|bear/)) bonuses.STR = 1;
    else if (lowerName.match(/dexterity|swift|cat|thief|speed/)) bonuses.DEX = 1;
    else if (lowerName.match(/health|vitality|life|heart/)) bonuses.CON = 1;
    else if (lowerName.match(/intelligence|mind|wisdom|owl|fox|smart/)) bonuses.INT = 1;
    else if (lowerName.match(/charisma|charm|king|leader|eagle|gold/)) bonuses.CHA = 1;
    else if (lowerName.match(/watch|gadget|device/)) bonuses.INT = 1; // Tech is usually INT
    else {
        // Random stat for generic accessories if no keyword matches
        const stats: (keyof CharacterStats)[] = ['STR', 'DEX', 'CON', 'INT', 'CHA'];
        const randomStat = stats[Math.floor(Math.random() * stats.length)];
        bonuses[randomStat] = 1;
    }
  }

  // --- 3. QUALITY MODIFIERS ---
  // Modifiers apply to the primary stat found above, or add a new one
  if (lowerName.match(/rusty|broken|cracked|shoddy|old/)) {
    // Penalty or reduce bonus. 
    // We simply won't add extra bonuses, or we reduce the primary one slightly (min 0)
    const keys = Object.keys(bonuses) as (keyof CharacterStats)[];
    if (keys.length > 0) {
        bonuses[keys[0]] = Math.max(1, (bonuses[keys[0]] || 1) - 1);
    }
  }
  
  if (lowerName.match(/magic|enchanted|legendary|flaming|divine|masterwork|high-tech|plasma|laser/)) {
    const keys = Object.keys(bonuses) as (keyof CharacterStats)[];
    if (keys.length > 0) {
       bonuses[keys[0]] = (bonuses[keys[0]] || 0) + 1;
    } else {
       // If it was misc but legendary, give it CHA
       bonuses.CHA = 1;
    }
  }

  return {
    id: generateId(),
    name,
    type,
    bonuses: Object.keys(bonuses).length > 0 ? bonuses : undefined
  };
};
