
import { StatType } from "../types";

interface KeywordMapping {
  stat: StatType;
  keywords: string[];
}

const KEYWORD_MAP: KeywordMapping[] = [
  {
    stat: 'STR',
    keywords: [
      'smash', 'break', 'lift', 'push', 'pull', 'force', 'crush', 'shove', 'throw', 'carry', 'drag', 'hold', 'grapple', 'punch', 'kick', 'strike', 'attack', 'fight', 'brawl', 'overpower', 'intimidate', 'climb', 'jump', 'leap', 'swim', 'run', 'sprint', 'dash', 'charge', 'brace', 'resist', 'endure'
    ]
  },
  {
    stat: 'DEX',
    keywords: [
      'dodge', 'evade', 'sneak', 'hide', 'creep', 'crawl', 'balance', 'tumble', 'roll', 'pick', 'unlock', 'disarm', 'steal', 'swipe', 'snatch', 'catch', 'aim', 'shoot', 'fire', 'throw', 'parry', 'deflect', 'maneuver', 'pilot', 'drive', 'ride', 'stealth', 'quiet', 'silent', 'fast', 'quick', 'agile', 'nimble'
    ]
  },
  {
    stat: 'CON',
    keywords: [
      'resist', 'endure', 'survive', 'withstand', 'hold breath', 'drink', 'eat', 'consume', 'rest', 'recover', 'heal', 'stabilize', 'tough', 'hardy', 'resilient', 'stamina', 'vitality', 'health', 'poison', 'disease', 'cold', 'heat', 'pain'
    ]
  },
  {
    stat: 'INT',
    keywords: [
      'analyze', 'investigate', 'examine', 'study', 'research', 'read', 'decipher', 'translate', 'recall', 'remember', 'know', 'understand', 'comprehend', 'calculate', 'solve', 'plan', 'strategize', 'craft', 'repair', 'build', 'hack', 'program', 'cast', 'spell', 'magic', 'arcane', 'history', 'nature', 'religion', 'science'
    ]
  },
  {
    stat: 'CHA',
    keywords: [
      'persuade', 'deceive', 'lie', 'bluff', 'intimidate', 'charm', 'seduce', 'perform', 'entertain', 'inspire', 'lead', 'command', 'negotiate', 'bargain', 'haggle', 'taunt', 'mock', 'distract', 'convince', 'talk', 'speak', 'shout', 'yell', 'roar'
    ]
  },
  {
    stat: 'PER',
    keywords: [
      'spot', 'search', 'find', 'locate', 'detect', 'notice', 'observe', 'watch', 'listen', 'hear', 'smell', 'taste', 'track', 'hunt', 'scout', 'scan', 'identify', 'discern', 'perceive', 'sense', 'insight', 'intuition', 'awareness', 'alert'
    ]
  },
  {
    stat: 'LUK',
    keywords: [
      'guess', 'gamble', 'bet', 'chance', 'risk', 'hope', 'pray', 'wish', 'luck', 'fortune', 'fate', 'destiny', 'random', 'wild', 'chaos'
    ]
  }
];

export const inferStatFromText = (text: string): StatType | null => {
  const lowerText = text.toLowerCase();
  
  // Check for explicit *keyword* formatting first
  const asteriskMatch = lowerText.match(/\*([a-z]+)\*/);
  if (asteriskMatch) {
    const keyword = asteriskMatch[1];
    for (const mapping of KEYWORD_MAP) {
      if (mapping.keywords.includes(keyword)) {
        return mapping.stat;
      }
    }
  }

  // Fallback: Check for keywords anywhere in the text
  for (const mapping of KEYWORD_MAP) {
    for (const keyword of mapping.keywords) {
      // Use word boundary to avoid partial matches (e.g. "scare" matching "car")
      const regex = new RegExp(`\\b${keyword}\\b`);
      if (regex.test(lowerText)) {
        return mapping.stat;
      }
    }
  }

  return null;
};
