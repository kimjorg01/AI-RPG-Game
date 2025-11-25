
import { GoogleGenAI, Type } from "@google/genai";
import { AIStoryResponse, ImageSize, StoryModel, CharacterStats, RollResult, InventoryItem, EquippedGear, StatusEffect, NPC } from "../types";
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
You must return valid JSON matching the schema.
`;

const OLLAMA_JSON_SCHEMA = `
REQUIRED JSON STRUCTURE:
{
  "narrative": "string (The story text)",
  "choices": [
    {
      "text": "string (Action description. Wrap key verbs in *asterisks*)",
      "type": "string (Optional: 'STR', 'DEX', 'CON', 'INT', 'CHA')",
      "difficulty": "number (Optional: DC 5-30)"
    }
  ],
  "inventory_added": [
    { "name": "string", "type": "string", "description": "string", "bonuses": { "STR": 0, "DEX": 0, "CON": 0, "INT": 0, "CHA": 0 } }
  ],
  "inventory_removed": ["string (item names)"],
  "equipment_update": { "equip": ["string"], "unequip": ["string"] },
  "hp_change": "number (negative for damage)",
  "game_status": "string ('ongoing', 'won', 'lost')",
  "new_effects": [],
  "npcs_update": { "add": [], "update": [], "remove": [] }
}
IMPORTANT: You MUST provide at least 2 options in the "choices" array.
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
  knownNPCs: NPC[],
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
  const npcString = formatNPCs(knownNPCs);

  const prompt = `
    [GAME STATE]
    Genre: ${genre}
    Health: ${currentHp} / ${stats.CON * 10 + 100}
    Quest: "${currentQuest}"
    
    [EQUIPPED_GEAR (ACTIVE)]
    ${equippedString}
    
    [BACKPACK_CONTENTS (INACTIVE - Must Equip to Use)]
    ${JSON.stringify(inventoryNames)}
    
    [KNOWN_NPCS]
    ${npcString}
    
    [RECENT_HISTORY]
    ${previousHistory}
    
    [PLAYER_ACTION]
    ${actionDescription}
    
    Based on the above, generate the next story segment in JSON.
  `;

  debugLog.addLog({ type: 'request', endpoint: 'generateStoryStep', model: modelName, content: prompt });

  try {
    if (modelName === StoryModel.LocalQwen || modelName === StoryModel.LocalGemma) {
        try {
            // Append explicit schema for Ollama since it doesn't support responseSchema in the same way
            const localSystemInstruction = SYSTEM_INSTRUCTION + "\n" + OLLAMA_JSON_SCHEMA;
            const responseText = await callOllama(modelName, prompt, localSystemInstruction, true);
            debugLog.addLog({ type: 'response', endpoint: 'generateStoryStep', model: modelName, content: responseText });
            return JSON.parse(responseText) as AIStoryResponse;
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

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
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
                    type: { type: Type.STRING, enum: ['STR', 'DEX', 'CON', 'INT', 'CHA'], nullable: true },
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
                  description: { type: Type.STRING },
                  bonuses: {
                    type: Type.OBJECT,
                    properties: {
                      STR: { type: Type.INTEGER },
                      DEX: { type: Type.INTEGER },
                      CON: { type: Type.INTEGER },
                      INT: { type: Type.INTEGER },
                      CHA: { type: Type.INTEGER },
                    },
                    nullable: true
                  }
                },
                required: ["name", "type"]
              } 
            },
            inventory_removed: { type: Type.ARRAY, items: { type: Type.STRING } },
            equipment_update: {
                type: Type.OBJECT,
                description: "Auto-equip items from inventory if the user's action implies drawing/using them.",
                properties: {
                    equip: { type: Type.ARRAY, items: { type: Type.STRING } },
                    unequip: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            },
            quest_update: { type: Type.STRING },
            hp_change: { type: Type.INTEGER },
            game_status: { type: Type.STRING, enum: ['ongoing', 'won', 'lost'] },
            new_effects: {
                type: Type.ARRAY,
                description: "Add temporary buffs or debuffs based on narrative context.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "e.g. Concussed, Empowered" },
                        description: { type: Type.STRING, description: "Short description of effect" },
                        type: { type: Type.STRING, enum: ['buff', 'debuff'] },
                        duration: { type: Type.INTEGER, description: "Number of turns this lasts (1-5)" },
                        blocksHeroicActions: { type: Type.BOOLEAN, nullable: true },
                        statModifiers: {
                            type: Type.OBJECT,
                            properties: {
                                STR: { type: Type.INTEGER },
                                DEX: { type: Type.INTEGER },
                                CON: { type: Type.INTEGER },
                                INT: { type: Type.INTEGER },
                                CHA: { type: Type.INTEGER },
                            }
                        }
                    },
                    required: ["name", "type", "duration"]
                }
            },
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
                    stat: { type: Type.STRING, enum: ['STR', 'DEX', 'CON', 'INT', 'CHA'] },
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
    
    debugLog.addLog({ type: 'response', endpoint: 'generateStoryStep', model: modelName, content: text });
    return JSON.parse(text) as AIStoryResponse;
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
