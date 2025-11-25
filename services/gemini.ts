
import { GoogleGenAI, Type } from "@google/genai";
import { AIStoryResponse, ImageSize, StoryModel, CharacterStats, RollResult, InventoryItem, EquippedGear, StatusEffect, NPC } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in process.env");
  }
  return new GoogleGenAI({ apiKey: apiKey });
};

const SYSTEM_INSTRUCTION = `
You are the Dungeon Master for an immersive, infinite RPG.
Your goal is to weave a compelling narrative based on the user's choices, GENRE, and STATS.

Rules:
1.  **Genre & Tone**: Adhere strictly to the selected genre (e.g., Fantasy, Sci-Fi, Horror).
2.  **Stats**: STR (Power), DEX (Agility), CON (Health), INT (Magic/Mind), CHA (Presence).
3.  **Equipment & Inventory (STRICT)**:
    *   **Context Matches Gear**: If the user chooses "Shoot them", CHECK THEIR EQUIPPED GEAR. If they hold a Sword, they fail or throw it.
    *   **Auto-Equip**: If the user's choice implies using an item they have in their **Backpack** (Inventory) but NOT equipped (e.g., "I pull out my Shotgun"), you MUST:
        *   Narrate the action of drawing the weapon.
        *   Populate 'equipment_update.equip' with the Item Name.
    *   **Lost Items**: If the narrative implies an item is broken, lost, or consumed (e.g., "The grenade explodes", "You drop the key"), CHECK if it exists in Inventory or Equipped. If yes, populate 'inventory_removed'. If no, simply mock the user for trying to use what they don't have.
4.  **Heroic Actions (Anti-Cheat)**: 
    *   If a user Custom Action attempts to conjure items they do not possess, DENY IT. Mock them.
    *   If they attempt an action physically impossible given the state, make them fail.
5.  **Skill Checks & Choices**:
    *   When generating choices, if an action is risky, assign a 'type' (STAT) and 'difficulty' (DC 5-30).
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
    Context:
    - Genre: ${genre}
    - Base Stats: STR:${stats.STR}, DEX:${stats.DEX}, CON:${stats.CON}, INT:${stats.INT}, CHA:${stats.CHA}
    
    Current Loadout (CRITICAL - RESPECT THIS):
    ${equippedString}
    
    Known People/NPCs:
    ${npcString}
    
    Stowed in Backpack (Must spend turn to equip): 
    ${JSON.stringify(inventoryNames)}
    
    - Quest: "${currentQuest}"
    - HP: ${currentHp} (Max based on CON)
    
    Previous Story:
    ${previousHistory}
    
    ${actionDescription}
    
    Generate the next segment.
  `;

  try {
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
            stats_update: {
                type: Type.OBJECT,
                description: "Optional: Increase a stat. Normal (+1), Special Event (+3 to +5).",
                properties: {
                    STR: { type: Type.INTEGER },
                    DEX: { type: Type.INTEGER },
                    CON: { type: Type.INTEGER },
                    INT: { type: Type.INTEGER },
                    CHA: { type: Type.INTEGER },
                }
            },
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
    
    return JSON.parse(text) as AIStoryResponse;
  } catch (error) {
    console.error("Story generation failed:", error);
    return {
      narrative: "The mists of time obscure the path forward... (AI Error, please try again)",
      choices: [{ text: "Attempt to reconnect with reality" }],
      hp_change: 0,
      game_status: 'ongoing'
    };
  }
};

export const generateGameSummary = async (historyText: string): Promise<string> => {
  const ai = getAIClient();
  const prompt = `
  Read the following adventure log and write a concise, engaging summary (3-5 sentences) of the entire journey. 
  Highlight the key conflicts, major decisions, and how it ended.
  
  LOG:
  ${historyText}
  `;
  
  try {
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
      });
      return response.text || "The tale is lost to the void.";
  } catch(e) {
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

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        console.error("Storyboard generation failed", e);
        return null;
    }
};
