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

const AUTHOR_SYSTEM = `
You are a Fantasy Author. 
Your task is to write the next segment of the story based on the user's action.
- Focus on description, dialogue, and action.
- Be concise (2-3 paragraphs).
- Use *asterisks* for emphasis.
- Do NOT mention game mechanics like HP, stats, or dice rolls explicitly (e.g. don't say "You take 5 damage", say "The blow staggers you").
- Do NOT provide choices.
- Do NOT decide the outcome of future actions.
`;

const DESIGNER_SYSTEM = `
You are a Game Systems Designer.
Your task is to analyze the provided story narrative and determine the mechanical changes.
Output ONLY the UPDATES section in the following format:

### UPDATES
HP: [Number, e.g. -5, +2, 0]
STATUS: [ongoing, won, lost]
QUEST: [New objective or SAME]
ITEM_ADD: [Name] | [Type] | [Description] | [Bonuses]
ITEM_REMOVE: [Name]
EQUIP: [Name]
UNEQUIP: [Name]
EFFECT_ADD: [Name] | [buff/debuff] | [Duration]

Rules:
- If the story implies damage, reduce HP.
- If the story implies death, set STATUS: lost.
- If the story implies victory, set STATUS: won.
- If the story mentions finding an item, use ITEM_ADD.
- If the story mentions using/losing an item, use ITEM_REMOVE.
`;

const DM_SYSTEM = `
You are a Dungeon Master.
Your task is to read the story narrative and the game updates, then offer 3 distinct choices for the player.
Output ONLY the CHOICES section in the following format:

### CHOICES
1. Action Description (Wrap ability words in *asterisks*) | Stat (STR/DEX/CON/INT/CHA/PER) or NONE | DC (5-30) or 0
2. Action Description | Stat | DC
3. Action Description | Stat | DC

Rules:
- Choices should be relevant to the current situation.
- Include a mix of combat, social, and exploration options if applicable.
- Assign appropriate Stats and Difficulty Classes (DC).
`;

const callAI = async (modelName: string, prompt: string, systemInstruction: string): Promise<string> => {
    const isLocal = modelName === StoryModel.LocalQwen || modelName === StoryModel.LocalGemma || modelName === StoryModel.LocalQwenCoder;
    
    if (isLocal) {
        return await callOllama(modelName, prompt, systemInstruction, false);
    } else {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: { systemInstruction }
        });
        return response.text || "";
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
        `;
      }
  }

  const inventoryNames = currentInventory.map(i => i.name);
  const equippedString = formatEquipped(equipped);

  // --- STEP 1: THE AUTHOR ---
  const authorPrompt = `
    [GAME CONTEXT]
    Genre: ${genre}
    Quest: "${currentQuest}"
    Current HP: ${currentHp}
    
    [RECENT HISTORY]
    ${previousHistory}
    
    [PLAYER ACTION]
    ${actionDescription}
    
    Write the next segment of the story.
  `;

  debugLog.addLog({ type: 'request', endpoint: 'generateStoryStep_Author', model: modelName, content: authorPrompt });

  let narrative = "";
  try {
      narrative = await callAI(modelName, authorPrompt, AUTHOR_SYSTEM);
      debugLog.addLog({ type: 'response', endpoint: 'generateStoryStep_Author', model: modelName, content: narrative });
  } catch (error) {
      console.error("Author Agent failed:", error);
      return { narrative: "The storyteller is silent...", choices: [{ text: "Try again" }], hp_change: 0, game_status: 'ongoing' };
  }

  // --- STEP 2: THE GAME DESIGNER ---
  const designerPrompt = `
    [CURRENT STATE]
    HP: ${currentHp} / ${stats.CON * 10 + 100}
    Inventory: ${JSON.stringify(inventoryNames)}
    Equipped: ${equippedString}
    
    [NEW STORY SEGMENT]
    ${narrative}
    
    Analyze the story and output the UPDATES section.
  `;

  debugLog.addLog({ type: 'request', endpoint: 'generateStoryStep_Designer', model: modelName, content: designerPrompt });

  let updates = "";
  try {
      updates = await callAI(modelName, designerPrompt, DESIGNER_SYSTEM);
      debugLog.addLog({ type: 'response', endpoint: 'generateStoryStep_Designer', model: modelName, content: updates });
  } catch (error) {
      console.error("Designer Agent failed:", error);
      // Continue without updates if designer fails
  }

  // --- STEP 3: THE DUNGEON MASTER ---
  const dmPrompt = `
    [STORY SO FAR]
    ${narrative}
    
    [GAME UPDATES]
    ${updates}
    
    [PLAYER STATS]
    STR:${stats.STR} DEX:${stats.DEX} CON:${stats.CON} INT:${stats.INT} CHA:${stats.CHA} PER:${stats.PER}
    
    Offer 3 choices for the player.
  `;

  debugLog.addLog({ type: 'request', endpoint: 'generateStoryStep_DM', model: modelName, content: dmPrompt });

  let choices = "";
  try {
      choices = await callAI(modelName, dmPrompt, DM_SYSTEM);
      debugLog.addLog({ type: 'response', endpoint: 'generateStoryStep_DM', model: modelName, content: choices });
  } catch (error) {
      console.error("DM Agent failed:", error);
      choices = "### CHOICES\n1. Continue... | NONE | 0";
  }

  // Combine and Parse
  const fullResponseText = `### NARRATIVE\n${narrative}\n\n${updates}\n\n${choices}`;
  return parseTextResponse(fullResponseText);
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
      if (modelName === StoryModel.LocalQwen || modelName === StoryModel.LocalGemma || modelName === StoryModel.LocalQwenCoder) {
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

const parseTextResponse = (text: string): AIStoryResponse => {
    const sections: Record<string, string> = {};
    // Regex now allows for horizontal whitespace [ \t]* after the section header before the newline
    const sectionRegex = /###\s*([A-Z_]+)[ \t]*(?:\r?\n|\r)([\s\S]*?)(?=(?:###\s*[A-Z_]+)|$)/g;
    
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
            let text = parts[0];
            // Clean up AI habit of wrapping in brackets
            if (text.startsWith('[') && text.endsWith(']')) {
                text = text.slice(1, -1);
            }
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
                
                // Filter out "NONE"
                if (parts[0].toUpperCase() === 'NONE') continue;

                // Parse Bonuses: "STR:1, DEX:2" or "STR+1"
                let bonuses: any = undefined;
                if (parts[3] && parts[3] !== 'NONE') {
                    bonuses = {};
                    // Robust regex to catch STR:1, STR+1, STR 1
                    const bonusRegex = /([A-Z]{3})\s*[:=+]?\s*(\d+)/g;
                    let match;
                    while ((match = bonusRegex.exec(parts[3])) !== null) {
                        const stat = match[1];
                        const val = parseInt(match[2]);
                        if (stat && !isNaN(val)) {
                            bonuses[stat] = val;
                        }
                    }
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
                if (name.toUpperCase() === 'NONE') continue;

                if (!response.inventory_removed) response.inventory_removed = [];
                response.inventory_removed.push(name);
            }

            if (cleanLine.startsWith('EQUIP:')) {
                const name = cleanLine.replace('EQUIP:', '').trim();
                if (name.toUpperCase() === 'NONE') continue;

                if (!response.equipment_update) response.equipment_update = { equip: [], unequip: [] };
                response.equipment_update.equip?.push(name);
            }

            if (cleanLine.startsWith('UNEQUIP:')) {
                const name = cleanLine.replace('UNEQUIP:', '').trim();
                if (name.toUpperCase() === 'NONE') continue;

                if (!response.equipment_update) response.equipment_update = { equip: [], unequip: [] };
                response.equipment_update.unequip?.push(name);
            }

            if (cleanLine.startsWith('EFFECT_ADD:')) {
                const parts = cleanLine.replace('EFFECT_ADD:', '').split('|').map(p => p.trim());
                if (parts[0].toUpperCase() === 'NONE') continue;

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
