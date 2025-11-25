
import { GoogleGenAI } from "@google/genai";
import { AIStoryResponse, ImageSize, StoryModel, CharacterStats, RollResult, InventoryItem, EquippedGear, StatusEffect } from "../types";
import { debugLog } from "./debugLog";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in process.env");
  }
  return new GoogleGenAI({ apiKey: apiKey });
};

const SYSTEM_INSTRUCTION = `
You are the Game Engine and Dungeon Master for a text-based RPG. 
Your primary function is to manage the GAME STATE strictly, and your secondary function is to narrate the story.

### GAMEPLAY RULES (STRICT ENFORCEMENT)
1. **Inventory vs. Equipped**: 
   - The player CANNOT use items in 'BACKPACK_CONTENTS' for combat/actions immediately. They must equip them first.
   - If the player tries to shoot a gun but only has a sword EQUIPPED, they effectively throw the sword or fail.
   - **Auto-Equip**: If the player says "I draw my Pistol" and they have one in the Backpack, use the 'equipment_update' field to equip it.

2. **Game Balance & Loot**:
   - Do NOT hand out "Legendary" items early. Keep bonuses small (+1 to +3).
   - Use the 'inventory_added' field for new items. Do NOT just mention them in text.
   - **Stat Generation**: Only assign bonuses if logically consistent (e.g., Heavy Armor reduces DEX, increases CON).

3. **Action Resolution (Dice Rolls)**:
   - **Standard Choices**: The outcome is already decided by the provided 'rollResult'. NARRATE the success or failure matching that result.
   - **Custom Actions**: 
     1. Analyze the action's difficulty (DC 5=Easy, 15=Hard, 25=Impossible) based *only* on the narrative situation.
     2. *Then* compare with the provided 'customAction.roll' + Stat Mod.
     3. If Roll < DC, they FAIL. Do not be lenient. Failures make the story interesting.

4. **Status Effects**:
   - If the player takes massive damage or hits a trap, apply a 'new_effect' (e.g., "Concussed", "Bleeding").
   - Effects should have mechanical consequences (statModifiers).

### OUTPUT FORMAT
DO NOT USE JSON. Use the standard Game Format below.

### NARRATIVE
(Write the story here. Use *asterisks* for emphasis.)

### CHOICES
1. [Action Description] | [Stat (STR/DEX/CON/INT/CHA/PER) or NONE] | [DC (5-30) or 0]
2. [Action Description] | [Stat] | [DC]

### UPDATES
HP: [Number, e.g. -5, +2, 0]
STATUS: [ongoing, won, lost]
QUEST: [New objective or SAME]
ITEM_ADD: [Name] | [Type (weapon/armor/accessory/misc)] | [Description] | [Bonuses (e.g. STR, PER) or NONE] | [Values (e.g. 8, 12) or NONE]
ITEM_REMOVE: [Name]
EQUIP: [Name]
UNEQUIP: [Name]
EFFECT_ADD: [Name] | [buff/debuff] | [Duration (turns)]

### ACTION_RESULT (Only for Custom Actions)
STAT: [Stat]
DC: [Number]
BASE: [Number]
TOTAL: [Number]
SUCCESS: [true/false]
`;

const parseTextResponse = (text: string): AIStoryResponse => {
    const sections: Record<string, string> = {};
    const sectionRegex = /###\s*([A-Z_]+)(?:\r?\n|\r)([\s\S]*?)(?=(?:###\s*[A-Z_]+)|$)/g;
    
    let match;
    while ((match = sectionRegex.exec(text)) !== null) {
        sections[match[1].trim()] = match[2].trim();
    }

    // Defaults
    const response: AIStoryResponse = {
        narrative: sections['NARRATIVE'] || text, // Fallback to full text if no sections
        choices: [],
        game_status: 'ongoing',
        hp_change: 0
    };

    // Parse Choices
    if (sections['CHOICES']) {
        const lines = sections['CHOICES'].split(/\r?\n/).filter(l => l.trim().length > 0);
        response.choices = lines.map(line => {
            // Expected: 1. Do something | STR | 15
            const parts = line.replace(/^\d+\.\s*/, '').split('|').map(p => p.trim());
            const text = parts[0];
            const type = (parts[1] === 'NONE' || !parts[1]) ? undefined : (parts[1] as any);
            const difficulty = parts[2] ? parseInt(parts[2]) : undefined;
            
            return { text, type, difficulty };
        });
    }
    
    // Parse Updates
    if (sections['UPDATES']) {
        const lines = sections['UPDATES'].split(/\r?\n/);
        for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) continue;

            if (cleanLine.startsWith('HP:')) response.hp_change = parseInt(cleanLine.replace('HP:', '').trim()) || 0;
            if (cleanLine.startsWith('STATUS:')) {
                const status = cleanLine.replace('STATUS:', '').trim();
                if (status === 'won' || status === 'lost') {
                    response.game_status = status;
                } else {
                    // If AI says "SAME" or anything else, keep it ongoing
                    response.game_status = 'ongoing';
                }
            }
            if (cleanLine.startsWith('QUEST:')) {
                const q = cleanLine.replace('QUEST:', '').trim();
                if (q !== 'SAME') response.quest_update = q;
            }
            
            // Items
            if (cleanLine.startsWith('ITEM_ADD:')) {
                const parts = cleanLine.replace('ITEM_ADD:', '').split('|').map(p => p.trim());
                
                // Parse Bonuses: "STR:1, DEX:2"
                let bonuses: any = undefined;
                if (parts[3] && parts[3] !== 'NONE') {
                    bonuses = {};
                    const bonusParts = parts[3].split(',');
                    bonusParts.forEach(b => {
                        const [stat, val] = b.split(':').map(s => s.trim());
                        if (stat && val) {
                            bonuses[stat] = parseInt(val);
                        }
                    });
                }

                if (!response.inventory_added) response.inventory_added = [];
                response.inventory_added.push({
                    name: parts[0],
                    type: (parts[1] as any) || 'misc',
                    description: parts[2] || '',
                    bonuses: bonuses
                });
            }

            if (cleanLine.startsWith('ITEM_REMOVE:')) {
                const name = cleanLine.replace('ITEM_REMOVE:', '').trim();
                if (!response.inventory_removed) response.inventory_removed = [];
                response.inventory_removed.push(name);
            }

            if (cleanLine.startsWith('EQUIP:')) {
                const name = cleanLine.replace('EQUIP:', '').trim();
                if (!response.equipment_update) response.equipment_update = { equip: [], unequip: [] };
                response.equipment_update.equip?.push(name);
            }

            if (cleanLine.startsWith('UNEQUIP:')) {
                const name = cleanLine.replace('UNEQUIP:', '').trim();
                if (!response.equipment_update) response.equipment_update = { equip: [], unequip: [] };
                response.equipment_update.unequip?.push(name);
            }

            if (cleanLine.startsWith('EFFECT_ADD:')) {
                const parts = cleanLine.replace('EFFECT_ADD:', '').split('|').map(p => p.trim());
                if (!response.new_effects) response.new_effects = [];
                response.new_effects.push({
                    id: Math.random().toString(36).substring(7), // Generate ID
                    name: parts[0],
                    type: (parts[1] as any) || 'debuff',
                    description: parts[0], // Default description to name
                    duration: parseInt(parts[2]) || 3
                });
            }
        }
    }

    // Parse Action Result
    if (sections['ACTION_RESULT']) {
        const lines = sections['ACTION_RESULT'].split(/\r?\n/);
        const result: any = {};
        for (const line of lines) {
            const [key, val] = line.split(':').map(s => s.trim());
            if (key === 'STAT') result.stat = val;
            if (key === 'DC') result.difficulty = parseInt(val);
            if (key === 'BASE') result.base_roll = parseInt(val);
            if (key === 'TOTAL') result.total = parseInt(val);
            if (key === 'SUCCESS') result.is_success = val.toLowerCase() === 'true';
        }
        if (result.stat) response.action_result = result;
    }
    
    return response;
}

const formatEquipped = (equipped: EquippedGear) => {
    const parts = [];
    if (equipped.weapon) parts.push(`[MAIN HAND]: ${equipped.weapon.name} (${JSON.stringify(equipped.weapon.bonuses)})`);
    else parts.push(`[MAIN HAND]: Empty (Unarmed)`);

    if (equipped.armor) parts.push(`[BODY]: ${equipped.armor.name} (${JSON.stringify(equipped.armor.bonuses)})`);
    if (equipped.accessory) parts.push(`[TRINKET]: ${equipped.accessory.name} (${JSON.stringify(equipped.accessory.bonuses)})`);
    
    return parts.join('\n    ');
};

const callOllama = async (model: string, prompt: string, systemInstruction: string, jsonMode: boolean = true): Promise<string> => {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        system: systemInstruction,
        format: jsonMode ? "json" : undefined,
        stream: false
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Ollama call failed:", error);
    throw error;
  }
};

export const generateStoryStep = async (
  previousHistory: string,
  userChoice: string,
  currentInventory: InventoryItem[],
  equipped: EquippedGear,
  currentQuest: string,
  currentHp: number,
  stats: CharacterStats,
  activeEffects: StatusEffect[],
  genre: string,
  rollResult: RollResult | null,
  customAction: { text: string, item: string, roll: number } | null,
  modelName: StoryModel = StoryModel.Smart
): Promise<AIStoryResponse> => {
  const ai = getAIClient();
  
  let actionDescription = "";

  if (customAction) {
      actionDescription = `
      User performs a HEROIC CUSTOM ACTION: "${customAction.text}"
      User claims to be using Item: ${customAction.item || "None"} (VERIFY this is equipped/owned before allowing bonuses).
      
      [INTERNAL RESOLUTION REQUIRED]
      1. Choose the most relevant STAT for this action.
      2. Set a DC (5 = Easy, 15 = Hard, 25 = Impossible).
      3. Use the RAW DIE ROLL provided: ${customAction.roll}
      4. Calculate: Total = ${customAction.roll} + (Stat Modifier).
      5. Narrate the outcome and populate the 'action_result' field in JSON.
      `;
  } else {
      actionDescription = `User's Latest Choice: "${userChoice}"`;
      if (rollResult) {
        actionDescription += `
        \n[ACTION RESOLUTION]
        - Skill Check: ${rollResult.statType}
        - Difficulty Class (DC): ${rollResult.difficulty}
        - Calculation: Roll(${rollResult.base}) + Mod(${rollResult.modifier}) = Total(${rollResult.total})
        - Result: ${rollResult.isSuccess ? "SUCCESS" : "FAILURE"}
        
        (Narrate the outcome based on this result. If it was a failure on a dangerous action, reduce HP or BREAK equipped item).
        `;
      }
  }

  const inventoryNames = currentInventory.map(i => i.name);
  const equippedString = formatEquipped(equipped);

  const prompt = `
    [GAME STATE]
    Genre: ${genre}
    Health: ${currentHp} / ${stats.CON * 10 + 100}
    Quest: "${currentQuest}"
    
    [EQUIPPED_GEAR (ACTIVE)]
    ${equippedString}
    
    [BACKPACK_CONTENTS (INACTIVE - Must Equip to Use)]
    ${JSON.stringify(inventoryNames)}
    
    [RECENT_HISTORY]
    ${previousHistory}
    
    [PLAYER_ACTION]
    ${actionDescription}
    
    Based on the above, generate the next story segment in the requested format.
  `;

  debugLog.addLog({ type: 'request', endpoint: 'generateStoryStep', model: modelName, content: prompt });

  try {
    // Use Text Parsing for ALL models for robustness and token efficiency
    if (modelName === StoryModel.LocalQwen || modelName === StoryModel.LocalGemma) {
        try {
            const responseText = await callOllama(modelName, prompt, SYSTEM_INSTRUCTION, false); // jsonMode = false
            debugLog.addLog({ type: 'response', endpoint: 'generateStoryStep', model: modelName, content: responseText });
            return parseTextResponse(responseText);
        } catch (error) {
            debugLog.addLog({ type: 'error', endpoint: 'generateStoryStep', model: modelName, content: error });
            console.error("Local LLM generation failed:", error);
            return {
                narrative: "The local spirits are silent... (Ollama Error: Ensure Ollama is running and the model is pulled)",
                choices: [{ text: "Try again" }],
                hp_change: 0,
                game_status: 'ongoing'
            };
        }
    }

    // For Gemini, we also use the text format now
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        // No responseMimeType or responseSchema - we want plain text
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text from AI");
    
    debugLog.addLog({ type: 'response', endpoint: 'generateStoryStep', model: modelName, content: text });
    return parseTextResponse(text);

  } catch (error) {
    debugLog.addLog({ type: 'error', endpoint: 'generateStoryStep', model: modelName, content: error });
    console.error("Story generation failed:", error);
    return {
      narrative: "The mists of time obscure the path forward... (AI Error, please try again)",
      choices: [{ text: "Attempt to reconnect with reality" }],
      hp_change: 0,
      game_status: 'ongoing'
    };
  }
};

export const generateGameSummary = async (historyText: string, modelName: StoryModel = StoryModel.Fast): Promise<string> => {
  const ai = getAIClient();
  const prompt = `
  Read the following adventure log and write a concise, engaging summary (3-5 sentences) of the entire journey. 
  Highlight the key conflicts, major decisions, and how it ended.
  
  LOG:
  ${historyText}
  `;
  
  debugLog.addLog({ type: 'request', endpoint: 'generateGameSummary', model: modelName, content: prompt });

  try {
      if (modelName === StoryModel.LocalQwen || modelName === StoryModel.LocalGemma) {
          try {
              const responseText = await callOllama(modelName, prompt, "You are a fantasy chronicler summarizing an adventure.", false);
              debugLog.addLog({ type: 'response', endpoint: 'generateGameSummary', model: modelName, content: responseText });
              return responseText;
          } catch (e) {
             debugLog.addLog({ type: 'error', endpoint: 'generateGameSummary', model: modelName, content: e });
             console.error("Local summary failed", e);
             return "Summary unavailable (Local LLM Error).";
          }
      }

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
      });
      const text = response.text || "The tale is lost to the void.";
      debugLog.addLog({ type: 'response', endpoint: 'generateGameSummary', model: 'gemini-2.5-flash', content: text });
      return text;
  } catch(e) {
      debugLog.addLog({ type: 'error', endpoint: 'generateGameSummary', model: 'gemini-2.5-flash', content: e });
      console.error(e);
      return "Summary unavailable.";
  }
};

export const generateStoryboard = async (summary: string): Promise<string | null> => {
    const ai = getAIClient();
    // High quality image model for the final reward
    const prompt = `
    Create a single high-quality image that looks like a comic book page or storyboard.
    It should contain exactly 10 distinct panels arranged in a grid.
    Style: Half-cartoon, vibrant, detailed, expressive fantasy art.
    Content: Visualize the following story summary in chronological order across the panels:
    
    "${summary}"
    
    Make it look epic and cohesive.
    `;

    debugLog.addLog({ type: 'request', endpoint: 'generateStoryboard', model: 'gemini-3-pro-image-preview', content: prompt });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: {
                    aspectRatio: "16:9",
                    imageSize: ImageSize.Size_2K 
                }
            }
        });

        debugLog.addLog({ type: 'response', endpoint: 'generateStoryboard', model: 'gemini-3-pro-image-preview', content: response });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        debugLog.addLog({ type: 'error', endpoint: 'generateStoryboard', model: 'gemini-3-pro-image-preview', content: e });
        console.error("Storyboard generation failed", e);
        return null;
    }
};
