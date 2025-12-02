
import { GoogleGenAI, Type } from "@google/genai";
import { AIStoryResponse, ImageSize, StoryModel, CharacterStats, RollResult, InventoryItem, EquippedGear, StatusEffect, NPC, MainStoryArc, GameLength } from "../types";

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
1.  **Genre & Tone**: Adhere strictly to the selected genre (e.g., Fantasy, Sci-Fi, Horror).
2.  **Stats**: STR (Power), DEX (Agility), CON (Health), INT (Magic/Mind), CHA (Presence), PER (Senses/Observation), LUK (Fate/Chance).
3.  **Equipment & Inventory (STRICT)**:
    *   **Context Matches Gear**: If the user chooses "Shoot them", CHECK THEIR EQUIPPED GEAR. If they hold a Sword, they fail or throw it.
    *   **Usage Rule**: If an item is NOT equipped, the user CANNOT use it effectively in combat/action sequences unless they spend a turn to equip it (which you should narrate as a setup action).
    *   **Lost Items**: If the narrative implies an item is broken, lost, or consumed (e.g., "The grenade explodes", "You drop the key"), CHECK if it exists in Inventory or Equipped. If yes, populate 'inventory_removed'. If no, simply mock the user for trying to use what they don't have.
4.  **Heroic Actions (Anti-Cheat)**: 
    *   If a user Custom Action attempts to conjure items they do not possess, DENY IT. Mock them.
    *   If they attempt an action physically impossible given the state, make them fail.
5.  **Skill Checks & Choices**:
    *   When generating choices, assign a 'type' (STAT) and 'difficulty' (DC 5-20).
    *   **Formatting**: In the 'text' of the choice, wrap the specific **verb or action phrase** that corresponds to the skill check in asterisks (*).
6.  **Status Effects**:
    *   Apply logic to the narrative. If the player is hurt, dizzy, terrified, or empowered, apply a **Status Effect**.
7.  **NPC Tracking**:
    *   Track significant characters. Use \`npcs_update\` to add or update their condition (Healthy -> Dead).

The current state (inventory, quest, hp, stats, active effects, known NPCs) will be provided.
`;

const formatEquipped = (equipped: EquippedGear) => {
    const parts = [];
    if (equipped.weapon) parts.push(`[MAIN HAND]: ${equipped.weapon.name} (${JSON.stringify(equipped.weapon.bonuses)})`);
    else parts.push(`[MAIN HAND]: Empty (Unarmed)`);

    if (equipped.armor) parts.push(`[BODY]: ${equipped.armor.name} (${JSON.stringify(equipped.armor.bonuses)})`);
    if (equipped.accessory) parts.push(`[TRINKET]: ${equipped.accessory.name} (${JSON.stringify(equipped.accessory.bonuses)})`);
    
    return parts.join('\n    ');
};

const formatNPCs = (npcs: NPC[]) => {
    if (npcs.length === 0) return "None known.";
    return npcs.map(n => `${n.name} (${n.type}): ${n.condition}`).join(', ');
};

export const generateMainStory = async (
    genre: string,
    stats: CharacterStats,
    modelName: StoryModel,
    gameLength: GameLength,
    onLog?: (type: 'request' | 'response' | 'error' | 'info', content: any) => void
): Promise<MainStoryArc> => {
    const ai = getAIClient();
    
    let lengthInstruction = "";
    if (gameLength === 'short') lengthInstruction = "Design a SHORT, fast-paced adventure. The plot should move quickly.";
    if (gameLength === 'long') lengthInstruction = "Design a LONG, epic saga. The plot should be intricate and slow-burning.";

    const prompt = `
    Create a unique, high-stakes RPG campaign outline based on the following:
    Genre: ${genre}
    Hero Stats: High ${Object.entries(stats).reduce((a, b) => a[1] > b[1] ? a : b)[0]} (Focus on this playstyle).
    ${lengthInstruction}

    Return a JSON object with:
    1. "campaignTitle": A catchy name for the adventure.
    2. "backgroundLore": A short paragraph setting the scene (the world state, the threat).
    3. "mainQuests": An array of exactly 3 objects, each with "id" (1, 2, 3), "title", "description", and "status" (set first to 'active', others 'pending'). 
       IMPORTANT: These descriptions must be BROAD, HIGH-LEVEL GOALS (e.g., "Cross the Desert", "Infiltrate the Citadel", "Find the Oracle"). 
       Do NOT provide specific solutions or step-by-step instructions. The player must figure out *how* to achieve them.
    4. "finalObjective": The ultimate win condition.
    `;

    if (onLog) onLog('request', prompt);

    try {
        const actualModel = modelName === StoryModel.SmartLowThinking ? StoryModel.Smart : modelName;
        const thinkingConfig = modelName === StoryModel.SmartLowThinking ? { thinkingLevel: "low" as any } : undefined;

        const response = await ai.models.generateContent({
            model: actualModel,
            contents: { parts: [{ text: prompt }] },
            config: {
                thinkingConfig,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        campaignTitle: { type: Type.STRING },
                        backgroundLore: { type: Type.STRING },
                        mainQuests: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    status: { type: Type.STRING, enum: ['active', 'pending'] }
                                }
                            }
                        },
                        finalObjective: { type: Type.STRING }
                    }
                }
            }
        });

        const text = response.text;
        if (onLog) onLog('response', text);
        return JSON.parse(text || "{}");
    } catch (error) {
        if (onLog) onLog('error', error);
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
  knownNPCs: NPC[],
  genre: string,
  rollResult: RollResult | null,
  customAction: { text: string, item: string, roll: number } | null,
  modelName: StoryModel = StoryModel.Smart,
  gameLength: GameLength = 'medium',
  onLog?: (type: 'request' | 'response' | 'error' | 'info', content: any) => void,
  mainStoryArc?: MainStoryArc
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
  const npcString = formatNPCs(knownNPCs);

  let campaignContext = '';
  if (mainStoryArc) {
      const activeQuest = mainStoryArc.mainQuests.find(q => q.status === 'active');
      
      let objective = activeQuest ? activeQuest.description : mainStoryArc.finalObjective;
      let urgency = "";

      // Thresholds based on Game Length
      let threshold = 20; // Medium
      if (gameLength === 'short') threshold = 10;
      if (gameLength === 'long') threshold = 35;

      if (activeQuest && activeQuest.turnCount && activeQuest.turnCount > threshold) {
            urgency = "CRITICAL INSTRUCTION: The player has been in this act for too long. You MUST steer the narrative towards the immediate conclusion of this act. Present a climax or a resolution NOW.";
      }

      campaignContext = `
      --- CAMPAIGN CONTEXT ---
      Title: ${mainStoryArc.campaignTitle}
      Lore: ${mainStoryArc.backgroundLore}
      Current Act Objective: ${objective}
      Final Goal: ${mainStoryArc.finalObjective}
      
      INSTRUCTIONS:
      1. If the user successfully completes the 'Current Act Objective', set "act_completed": true in the JSON.
      2. Do NOT set "game_status": "won" unless the 'Final Goal' is fully achieved.
      ${urgency}
      ------------------------
      `;
  }

  const prompt = `
    Context:
    - Genre: ${genre}
    - Base Stats: STR:${stats.STR}, DEX:${stats.DEX}, CON:${stats.CON}, INT:${stats.INT}, CHA:${stats.CHA}, PER:${stats.PER}, LUK:${stats.LUK}
    
    Current Loadout (CRITICAL - RESPECT THIS):
    ${equippedString}
    
    Known People/NPCs:
    ${npcString}
    
    Stowed in Backpack (Must spend turn to equip): 
    ${JSON.stringify(inventoryNames)}
    
    - Quest: "${currentQuest}"
    - HP: ${currentHp} (Max based on CON)
    
    [RECENT HISTORY]
    ${previousHistory}
    
    [PLAYER ACTION]
    ${actionDescription}
    
    ${campaignContext}

    Generate the next segment.
  `;

  if (onLog) onLog('request', prompt);

  let actualModel = modelName as string;
  let thinkingConfig: any = undefined;

  if (modelName === StoryModel.SmartLowThinking) {
      actualModel = StoryModel.Smart;
      thinkingConfig = { thinkingLevel: "low" };
  }

  try {
    const response = await ai.models.generateContent({
      model: actualModel,
      contents: prompt,
      config: {
        thinkingConfig,
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            narrative: { type: Type.STRING, description: "The story text." },
            choices: { 
              type: Type.ARRAY, 
              description: "2-4 options. Add 'type' and 'difficulty' ONLY if the choice carries a risk of failure.",
              items: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING, description: "Description of the action. Wrap the key VERB/ACTION in asterisks * like *THIS*." },
                    type: { type: Type.STRING, enum: ['STR', 'DEX', 'CON', 'INT', 'CHA', 'PER', 'LUK'], nullable: true },
                    difficulty: { type: Type.INTEGER, nullable: true, description: "DC between 5 and 30" }
                },
                required: ["text"]
              }
            },
            inventory_added: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['weapon', 'armor', 'accessory', 'misc'] },
                  description: { type: Type.STRING }
                },
                required: ["name", "type"]
              } 
            },
            inventory_removed: { type: Type.ARRAY, items: { type: Type.STRING } },
            quest_update: { type: Type.STRING },
            hp_change: { type: Type.INTEGER },
            game_status: { type: Type.STRING, enum: ['ongoing', 'won', 'lost'] },
            act_completed: { type: Type.BOOLEAN, description: "Set to true ONLY when the Current Act Objective is fully resolved." },
            npcs_update: {
                type: Type.OBJECT,
                properties: {
                    add: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                description: { type: Type.STRING },
                                type: { type: Type.STRING, enum: ['Friendly', 'Hostile', 'Neutral', 'Unknown'] },
                                condition: { type: Type.STRING, enum: ['Healthy', 'Injured', 'Dying', 'Dead', 'Unknown', '???'] }
                            },
                            required: ["name", "type", "condition"]
                        }
                    },
                    update: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                condition: { type: Type.STRING, enum: ['Healthy', 'Injured', 'Dying', 'Dead', 'Unknown', '???'] },
                                status: { type: Type.STRING, nullable: true } // allow type change
                            },
                            required: ["name", "condition"]
                        }
                    },
                    remove: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            },
            action_result: {
                type: Type.OBJECT,
                description: "Required ONLY for Custom Actions: Return the calculated result of the action.",
                properties: {
                    stat: { type: Type.STRING, enum: ['STR', 'DEX', 'CON', 'INT', 'CHA', 'PER', 'LUK'] },
                    difficulty: { type: Type.INTEGER },
                    base_roll: { type: Type.INTEGER },
                    total: { type: Type.INTEGER },
                    is_success: { type: Type.BOOLEAN }
                },
                nullable: true
            }
          },
          required: ["narrative", "choices", "game_status"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text from AI");
    
    if (onLog) onLog('response', text);

    try {
        return JSON.parse(text) as AIStoryResponse;
    } catch (parseError) {
        if (onLog) onLog('error', `JSON Parse Error: ${parseError}\nRaw Text: ${text}`);
        console.error("JSON Parse Error", parseError);
        // Fallback to prevent crash
        return {
            narrative: "The world shifts and blurs... (AI returned invalid data).",
            choices: [{ text: "Try to focus" }],
            game_status: 'ongoing'
        };
    }

  } catch (error) {
    if (onLog) onLog('error', error);
    console.error("Story generation failed:", error);
    return {
      narrative: "The mists of time obscure the path forward... (AI Error, please try again)",
      choices: [{ text: "Attempt to reconnect with reality" }],
      hp_change: 0,
      game_status: 'ongoing'
    };
  }
};

export const generateGameSummary = async (
    historyText: string,
    onLog?: (type: 'request' | 'response' | 'error', content: any) => void
): Promise<string> => {
  const ai = getAIClient();
  const prompt = `
  Read the following adventure log and write a concise, engaging summary (3-5 sentences) of the entire journey. 
  Highlight the key conflicts, major decisions, and how it ended.
  
  LOG:
  ${historyText}
  `;
  
  if (onLog) onLog('request', `[SUMMARY GENERATION]\n${prompt}`);

  try {
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
      });
      const text = response.text || "The tale is lost to the void.";
      if (onLog) onLog('response', `[SUMMARY RESULT]\n${text}`);
      return text;
  } catch(e) {
      if (onLog) onLog('error', `[SUMMARY ERROR]\n${e}`);
      console.error(e);
      return "Summary unavailable.";
  }
};

export const generateStoryboard = async (
    summary: string,
    onLog?: (type: 'request' | 'response' | 'error', content: any) => void
): Promise<string | null> => {
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

    if (onLog) onLog('request', `[IMAGE GENERATION]\n${prompt}`);

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
                if (onLog) onLog('response', `[IMAGE GENERATED]\n(Base64 Image Data Received)`);
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        if (onLog) onLog('error', `[IMAGE ERROR]\nNo inline data found in response.`);
        return null;
    } catch (e) {
        if (onLog) onLog('error', `[IMAGE ERROR]\n${e}`);
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
