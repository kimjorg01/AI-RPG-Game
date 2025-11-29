
import { GoogleGenAI, Type } from "@google/genai";
import { AIStoryResponse, ImageSize, StoryModel, CharacterStats, RollResult, InventoryItem, EquippedGear, StatusEffect, NPC, MainStoryArc, GameLength } from "../types";

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
    
    Previous Story:
    ${previousHistory}
    
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
