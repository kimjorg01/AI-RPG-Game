
import { InventoryItem, ItemType, CharacterStats, ConsumableEffect, StatType } from "../types";

const generateId = () => Math.random().toString(36).substring(2, 9);

export const createItemFromString = (name: string): InventoryItem => {
  const lowerName = name.toLowerCase();
  let type: ItemType = 'misc';
  let bonuses: Partial<CharacterStats> = {};
  let consumableEffect: ConsumableEffect | undefined = undefined;

  // --- 1. DETERMINE TYPE ---

  // Consumables
  if (lowerName.match(/potion|elixir|tonic|brew|flask|vial|stim|medkit|bandage|salve|pill|tablet|injector|ration|food|drink|snack|meal|bread|water|wine|ale|beer/)) {
      type = 'consumable';
      
      // Determine Effect
      if (lowerName.match(/health|heal|life|vitality|medkit|bandage|salve|ration|food|bread/)) {
          consumableEffect = {
              type: 'heal',
              value: 15 + Math.floor(Math.random() * 15) // 15-30 HP
          };
      } else if (lowerName.match(/stim|injector|adrenaline|rage|frenzy/)) {
          consumableEffect = {
              type: 'stat_boost',
              stat: 'STR',
              value: 2,
              duration: 4,
              penaltyStat: 'INT',
              penaltyValue: 1
          };
      } else if (lowerName.match(/focus|mind|clarity|intelligence|mana/)) {
          consumableEffect = {
              type: 'stat_boost',
              stat: 'INT',
              value: 2,
              duration: 4,
              penaltyStat: 'CON',
              penaltyValue: 1
          };
      } else if (lowerName.match(/speed|haste|swift|dexterity|reflex/)) {
          consumableEffect = {
              type: 'stat_boost',
              stat: 'DEX',
              value: 2,
              duration: 4,
              penaltyStat: 'STR',
              penaltyValue: 1
          };
      } else if (lowerName.match(/iron|skin|bark|defense|constitution|fortitude/)) {
          consumableEffect = {
              type: 'stat_boost',
              stat: 'CON',
              value: 2,
              duration: 4,
              penaltyStat: 'DEX',
              penaltyValue: 1
          };
      } else {
          // Generic Potion -> Small Heal
          consumableEffect = {
              type: 'heal',
              value: 10 + Math.floor(Math.random() * 10)
          };
      }
  }
  // Weapons: Melee, Ranged, Magic, Sci-Fi
  else if (lowerName.match(/sword|axe|dagger|blade|spear|mace|hammer|bow|staff|wand|rod|scepter|pipe|bar|club|stick|rock|stone|brick|shiv|knife|glass|shard|wrench|crowbar|bat|pistol|rifle|gun|blaster|saber|claws|fist|knuckles|gauntlet|scythe|whip|flail|morningstar|halberd|pike|lance|trident|rapier|katana|scimitar|claymore|zweihander|maul|sledge|crossbow|dart|shuriken|sling|revolver|sniper|shotgun|smg|cannon|raygun|phaser|taser|prod|cutter|chainsaw|drill/)) {
    type = 'weapon';
  } 
  // Armor: Body, Head, Shield, Feet, Hands
  else if (lowerName.match(/shield|armor|mail|plate|helmet|helm|cap|hat|robe|cloak|vest|jacket|coat|shirt|tunic|boots|shoes|sandals|gloves|bracers|pants|greaves|suit|garb|cuirass|breastplate|brigandine|hide|leather|kevlar|flak|exoskeleton|mech|power|bodysuit|jumpsuit|cowl|hood|mask|visor|buckler|targe/)) {
    type = 'armor';
  } 
  // Accessories: Jewelry, Wearables, Gadgets, Magic Items
  else if (lowerName.match(/ring|amulet|necklace|charm|gem|stone|talisman|watch|goggles|glasses|monocle|crown|tiara|circlet|belt|sash|girdle|scarf|pendant|orb|device|gadget|tool|kit|totem|idol|relic|artifact|symbol|badge|medal|token|card|die|dice|coin|lens|scope|tracker|scanner|implant|chip/)) {
    type = 'accessory';
  }

  // --- 2. ASSIGN STATS BASED ON KEYWORDS ---
  
  if (type === 'weapon') {
    // STR: Heavy, Blunt, Two-Handed
    if (lowerName.match(/heavy|great|hammer|axe|mace|club|pipe|bar|wrench|crowbar|bat|rock|brick|maul|sledge|flail|morningstar|claymore|zweihander|halberd|pike|lance|trident|chainsaw|drill|cannon/)) {
      bonuses.STR = (bonuses.STR || 0) + 2;
    } 
    // DEX: Finesse, Ranged, Light
    else if (lowerName.match(/dagger|bow|rapier|knife|shiv|spear|pistol|rifle|gun|blaster|scimitar|katana|saber|whip|dart|shuriken|sling|revolver|sniper|shotgun|smg|raygun|phaser|needle|scalpel/)) {
      bonuses.DEX = (bonuses.DEX || 0) + 2;
    } 
    // INT: Magic, Tech, Complex
    else if (lowerName.match(/staff|wand|tome|rod|scepter|orb|crystal|rune|grimoire|scroll|taser|prod|cutter|laser|plasma|shock/)) {
      bonuses.INT = (bonuses.INT || 0) + 2;
    }
    // PER: Precision weapons
    else if (lowerName.match(/sniper|scope|sight|longbow|crossbow/)) {
      bonuses.PER = (bonuses.PER || 0) + 2;
      bonuses.DEX = (bonuses.DEX || 0) + 1;
    }
    // CHA: Flashy weapons
    else if (lowerName.match(/golden|ornate|royal|king|queen|ceremonial|rapier/)) {
      bonuses.CHA = (bonuses.CHA || 0) + 2;
      bonuses.DEX = (bonuses.DEX || 0) + 1;
    }
    // Default Weapon (Sword, etc) -> STR/DEX mix
    else {
      bonuses.STR = (bonuses.STR || 0) + 1;
      bonuses.DEX = (bonuses.DEX || 0) + 1;
    }
  } 
  
  else if (type === 'armor') {
    // Heavy / Metal -> CON++ / DEX-
    if (lowerName.match(/plate|heavy|mail|metal|riot|mech|power|exoskeleton|full|knight/)) {
      bonuses.CON = (bonuses.CON || 0) + 3;
      bonuses.DEX = (bonuses.DEX || 0) - 1; 
    } 
    // Medium / Tactical -> CON+ / DEX+
    else if (lowerName.match(/kevlar|tactical|flak|vest|breastplate|cuirass|brigandine|chain|scale/)) {
      bonuses.CON = (bonuses.CON || 0) + 2;
    }
    // Light / Stealth -> DEX++
    else if (lowerName.match(/leather|studded|padded|gambeson|tunic|bodysuit|jumpsuit|stealth|camo|ninja|thief/)) {
      bonuses.DEX = (bonuses.DEX || 0) + 2;
      bonuses.CON = (bonuses.CON || 0) + 1;
    }
    // Magic / Robes -> INT++ / CON+
    else if (lowerName.match(/robe|cloak|wizard|mage|sorcerer|cowl|hood|vestment|mantle/)) {
      bonuses.INT = (bonuses.INT || 0) + 2;
      bonuses.CON = (bonuses.CON || 0) + 1;
    } 
    // Shields -> CON++ / STR+
    else if (lowerName.match(/shield|buckler|targe|bulwark/)) {
      bonuses.CON = (bonuses.CON || 0) + 2;
      bonuses.STR = (bonuses.STR || 0) + 1;
    }
    // Default Armor -> CON+
    else {
      bonuses.CON = (bonuses.CON || 0) + 1;
    }
  } 
  
  else if (type === 'accessory') {
    // Specific Stat Keywords
    if (lowerName.match(/strength|power|muscle|bear|bull|giant|titan|force|impact/)) bonuses.STR = 1;
    else if (lowerName.match(/dexterity|swift|cat|thief|speed|reflex|agility|cobra|viper|wind/)) bonuses.DEX = 1;
    else if (lowerName.match(/health|vitality|life|heart|troll|regeneration|stamina|endurance/)) bonuses.CON = 1;
    else if (lowerName.match(/intelligence|mind|wisdom|owl|fox|smart|sage|arcane|knowledge|logic|memory/)) bonuses.INT = 1;
    else if (lowerName.match(/charisma|charm|king|leader|eagle|gold|presence|persuasion|diplomat|noble/)) bonuses.CHA = 1;
    else if (lowerName.match(/perception|sight|eye|vision|scope|lens|glasses|goggles|tracker|scanner|hawk|eagle|scout/)) bonuses.PER = 1;
    else if (lowerName.match(/luck|fate|fortune|clover|coin|rabbit|dice|chance|gambler|chaos|wild/)) bonuses.LUK = 1;
    
    // Tech -> INT/PER
    else if (lowerName.match(/watch|gadget|device|implant|chip|sensor|computer|datapad/)) {
        bonuses.INT = 1;
        bonuses.PER = 1;
    }
    // Magic -> INT/CHA
    else if (lowerName.match(/ring|amulet|talisman|orb|gem|crystal/)) {
        // If no specific stat matched above, give a random mental stat
        const mentalStats: (keyof CharacterStats)[] = ['INT', 'CHA', 'PER', 'LUK'];
        const randomStat = mentalStats[Math.floor(Math.random() * mentalStats.length)];
        bonuses[randomStat] = 1;
    }
    else {
        // Random stat for generic accessories if no keyword matches
        const stats: (keyof CharacterStats)[] = ['STR', 'DEX', 'CON', 'INT', 'CHA', 'PER', 'LUK'];
        const randomStat = stats[Math.floor(Math.random() * stats.length)];
        bonuses[randomStat] = 1;
    }
  }

  // --- 3. QUALITY MODIFIERS ---
  
  // Negative Modifiers
  if (lowerName.match(/rusty|broken|cracked|shoddy|old|weak|dull|dirty|poor|cursed|damaged/)) {
    const keys = Object.keys(bonuses) as (keyof CharacterStats)[];
    if (keys.length > 0) {
        // Reduce the highest bonus
        const primary = keys[0];
        bonuses[primary] = Math.max(0, (bonuses[primary] || 1) - 1);
    }
    // Cursed items might give bad luck
    if (lowerName.match(/cursed/)) {
        bonuses.LUK = (bonuses.LUK || 0) - 2;
    }
  }
  
  // Positive Modifiers
  if (lowerName.match(/fine|sharp|balanced|reinforced|hardened|polished|new|quality|improved/)) {
     const keys = Object.keys(bonuses) as (keyof CharacterStats)[];
     if (keys.length > 0) {
        bonuses[keys[0]] = (bonuses[keys[0]] || 0) + 1;
     }
  }

  // Legendary / Magic Modifiers
  if (lowerName.match(/magic|enchanted|legendary|epic|mythic|ancient|divine|holy|demonic|masterwork|high-tech|plasma|laser|quantum|cybernetic|glowing|flaming|frozen|shocking|vampiric/)) {
    const keys = Object.keys(bonuses) as (keyof CharacterStats)[];
    if (keys.length > 0) {
       // Boost primary stat significantly
       bonuses[keys[0]] = (bonuses[keys[0]] || 0) + 2;
       // Add a secondary stat based on flavor
       if (lowerName.match(/flaming|shocking|plasma|laser/)) bonuses.STR = (bonuses.STR || 0) + 1; // Damage
       if (lowerName.match(/frozen|holy|divine/)) bonuses.CON = (bonuses.CON || 0) + 1; // Defense/Health
       if (lowerName.match(/demonic|vampiric/)) bonuses.LUK = (bonuses.LUK || 0) - 1; // Cost
       if (lowerName.match(/ancient|mythic/)) bonuses.INT = (bonuses.INT || 0) + 1; // Knowledge
    } else {
       // If it was misc but legendary, give it CHA/LUK
       bonuses.CHA = 2;
       bonuses.LUK = 1;
    }
  }

  return {
    id: generateId(),
    name,
    type,
    bonuses: Object.keys(bonuses).length > 0 ? bonuses : undefined,
    consumableEffect
  };
};
