
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { StoryFeed } from './components/StoryFeed';
import { SettingsModal } from './components/SettingsModal';
import { GenreSelect } from './components/GenreSelect';
import { StatBuilder } from './components/StatBuilder';
import { DiceRoller } from './components/DiceRoller';
import { MainMenu } from './components/MainMenu';
import { GameOverScreen } from './components/GameOverScreen';
import { CustomChoiceModal } from './components/CustomChoiceModal';
import { GameState, StoryTurn, AppSettings, ImageSize, StoryModel, GamePhase, CharacterStats, ChoiceData, RollResult, SaveData, InventoryItem, EquippedGear, StatExperience, LevelUpEvent, StatusEffect, StatType, NPC, UIScale } from './types';
import { generateStoryStep, generateGameSummary, generateStoryboard } from './services/gemini';
import { createItemFromString } from './services/itemFactory';
import { inferStatFromText } from './services/statInference';
import { Menu, Send, Settings, Dices, AlertTriangle, CheckCircle2, Skull, Sparkles, User, Backpack, Sword, Zap, Shield, Brain, Crown, Circle, Eye, Clover, Terminal } from 'lucide-react';
import { DebugConsole, LogEntry } from './components/DebugConsole';

const BASE_HP = 100;
const DEFAULT_STATS = { STR: 10, DEX: 10, CON: 10, INT: 10, CHA: 10, PER: 10, LUK: 10 };
const EXP_THRESHOLD = 3;

// Helper to determine risk visual properties
const getRiskAssessment = (difficulty: number, statVal: number) => {
  const mod = Math.floor((statVal - 10) / 2);
  // Formula: To succeed, Roll + Mod >= DC  =>  Roll >= DC - Mod
  const targetRoll = difficulty - mod;
  
  // Chance: (21 - targetRoll) / 20. 
  let chance = ((21 - targetRoll) / 20) * 100;
  
  // Clamp for logic (nat 1 is always fail, nat 20 is always success roughly)
  chance = Math.max(5, Math.min(95, chance));

  let label = "Unknown";
  
  if (chance <= 30) {
    label = "Dangerous";
  } else if (chance <= 60) {
    label = "Risky";
  } else {
    label = "Likely Success";
  }

  return { chance, label, mod };
};

const getRiskColorHSL = (percentage: number) => {
    // Map 0-100% to Hue 0 (Red) - 120 (Green)
    const hue = Math.max(0, Math.min(120, percentage * 1.2));
    return `hsl(${hue}, 80%, 45%)`;
};

const getStatConfig = (stat: string) => {
  switch (stat) {
    case 'STR': return { icon: Sword, color: 'text-red-500', label: 'Strength', borderHover: 'hover:border-red-500', bgHover: 'hover:bg-red-950/20' };
    case 'DEX': return { icon: Zap, color: 'text-emerald-500', label: 'Dexterity', borderHover: 'hover:border-emerald-500', bgHover: 'hover:bg-emerald-950/20' };
    case 'CON': return { icon: Shield, color: 'text-orange-500', label: 'Constitution', borderHover: 'hover:border-orange-500', bgHover: 'hover:bg-orange-950/20' };
    case 'INT': return { icon: Brain, color: 'text-blue-500', label: 'Intelligence', borderHover: 'hover:border-blue-500', bgHover: 'hover:bg-blue-950/20' };
    case 'CHA': return { icon: Crown, color: 'text-purple-500', label: 'Charisma', borderHover: 'hover:border-purple-500', bgHover: 'hover:bg-purple-950/20' };
    case 'PER': return { icon: Eye, color: 'text-teal-500', label: 'Perception', borderHover: 'hover:border-teal-500', bgHover: 'hover:bg-teal-950/20' };
    case 'LUK': return { icon: Clover, color: 'text-yellow-500', label: 'Luck', borderHover: 'hover:border-yellow-500', bgHover: 'hover:bg-yellow-950/20' };
    default: return { icon: Circle, color: 'text-zinc-400', label: 'Action', borderHover: 'hover:border-zinc-500', bgHover: 'hover:bg-zinc-900/50' };
  }
};

const App: React.FC = () => {
  // --- State Management ---
  const [gameState, setGameState] = useState<GameState>({
    inventory: [],
    equipped: { weapon: null, armor: null, accessory: null },
    currentQuest: "",
    npcs: [],
    history: [],
    isLoading: false,
    isRolling: false,
    hp: BASE_HP,
    maxHp: BASE_HP,
    hpHistory: [BASE_HP], 
    gameStatus: 'ongoing',
    phase: 'menu',
    genre: 'Fantasy',
    stats: DEFAULT_STATS,
    statExperience: { STR: 0, DEX: 0, CON: 0, INT: 0, CHA: 0, PER: 0, LUK: 0 },
    activeEffects: [],
    startingStats: DEFAULT_STATS,
    customChoicesRemaining: 3
  });

  const [settings, setSettings] = useState<AppSettings>({
    imageSize: ImageSize.Size_2K,
    storyModel: StoryModel.Smart,
    uiScale: UIScale.Normal
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [showCustomChoice, setShowCustomChoice] = useState(false);
  const [currentChoices, setCurrentChoices] = useState<ChoiceData[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);
  
  // Debug Console State
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<LogEntry[]>([]);

  const addLog = (type: 'request' | 'response' | 'error', content: any) => {
    setDebugLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      type,
      content
    }]);
  };
  
  const [pendingChoice, setPendingChoice] = useState<ChoiceData | null>(null);
  
  // Highlighting State for Interactions
  const [hoveredStat, setHoveredStat] = useState<StatType | null>(null);

  const checkApiKey = async () => {
    if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    }
  };

  useEffect(() => { checkApiKey(); }, []);
  
  // Handle End Game Summary & Storyboard
  useEffect(() => {
      if (gameState.phase === 'game_over' && !gameState.finalSummary) {
          const fullLog = gameState.history.map(t => `${t.isUserTurn ? 'USER' : 'DM'}: ${t.text}`).join('\n');
          generateGameSummary(fullLog, addLog).then(summary => {
              setGameState(prev => ({ ...prev, finalSummary: summary }));
              
              // Only generate storyboard if user has API key (uses paid model generally)
              // or allow it and let it fail/prompt.
              if (hasApiKey) {
                  generateStoryboard(summary, addLog).then(imageUrl => {
                      if (imageUrl) {
                          setGameState(prev => ({ ...prev, finalStoryboard: imageUrl }));
                      }
                  });
              }
          });
      }
  }, [gameState.phase, gameState.finalSummary, gameState.history, hasApiKey]);

  // Derived Stats Calculation
  const currentStats = useMemo(() => {
      const { stats, equipped, activeEffects } = gameState;
      const calculated = { ...stats };
      
      const applyBonus = (bonuses: Partial<CharacterStats> | undefined) => {
          if (!bonuses) return;
          if (bonuses.STR) calculated.STR += bonuses.STR;
          if (bonuses.DEX) calculated.DEX += bonuses.DEX;
          if (bonuses.CON) calculated.CON += bonuses.CON;
          if (bonuses.INT) calculated.INT += bonuses.INT;
          if (bonuses.CHA) calculated.CHA += bonuses.CHA;
          if (bonuses.PER) calculated.PER += bonuses.PER;
          if (bonuses.LUK) calculated.LUK += bonuses.LUK;
      };

      applyBonus(equipped.weapon?.bonuses);
      applyBonus(equipped.armor?.bonuses);
      applyBonus(equipped.accessory?.bonuses);
      
      activeEffects?.forEach(effect => {
          applyBonus(effect.statModifiers);
      });
      
      return calculated;
  }, [gameState.stats, gameState.equipped, gameState.activeEffects]);

  const handleSelectKey = async () => {
    if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
      checkApiKey(); 
    }
  };

  const getMod = (score: number) => Math.floor((score - 10) / 2);

  // Recalculate MaxHP whenever CON changes
  useEffect(() => {
    const conMod = getMod(currentStats.CON);
    const newMax = BASE_HP + (conMod * 10);
    setGameState(prev => {
        if (prev.maxHp !== newMax) {
            const ratio = prev.hp / prev.maxHp;
            return { ...prev, maxHp: newMax, hp: Math.round(newMax * ratio) };
        }
        return prev;
    });
  }, [currentStats.CON]);

  const isHeroicBlocked = useMemo(() => {
     return gameState.activeEffects?.some(e => e.blocksHeroicActions);
  }, [gameState.activeEffects]);

  // --- Equipment Handlers ---
  const handleEquip = (item: InventoryItem) => {
      setGameState(prev => {
          const newInventory = prev.inventory.filter(i => i.id !== item.id);
          const slot = item.type === 'weapon' ? 'weapon' : item.type === 'armor' ? 'armor' : item.type === 'accessory' ? 'accessory' : null;
          if (!slot) return prev; 
          
          const oldItem = prev.equipped[slot];
          if (oldItem) {
              newInventory.push(oldItem);
          }

          return {
              ...prev,
              inventory: newInventory,
              equipped: {
                  ...prev.equipped,
                  [slot]: item
              }
          };
      });
  };

  const handleUnequip = (item: InventoryItem) => {
      setGameState(prev => {
          if (prev.inventory.length >= 8) {
              addLog('error', 'Inventory is full! Cannot unequip item.');
              return prev;
          }

          const slot = item.type === 'weapon' ? 'weapon' : item.type === 'armor' ? 'armor' : item.type === 'accessory' ? 'accessory' : null;
          if (!slot) return prev;

          if (prev.equipped[slot]?.id !== item.id) return prev;

          return {
              ...prev,
              equipped: {
                  ...prev.equipped,
                  [slot]: null
              },
              inventory: [...prev.inventory, item]
          };
      });
  };

  const handleDiscard = (item: InventoryItem) => {
      setGameState(prev => ({
          ...prev,
          inventory: prev.inventory.filter(i => i.id !== item.id)
      }));
  };

  // --- Core Game Logic ---
  const handleNewGame = () => {
    setGameState(prev => ({ 
        ...prev, 
        phase: 'setup_genre',
        history: [], 
        inventory: [],
        npcs: [],
        equipped: { weapon: null, armor: null, accessory: null },
        hpHistory: [BASE_HP],
        statExperience: { STR: 0, DEX: 0, CON: 0, INT: 0, CHA: 0, PER: 0, LUK: 0 },
        activeEffects: [],
        customChoicesRemaining: 3,
        finalSummary: undefined,
        finalStoryboard: undefined
    }));
  };

  const handleGenreSelect = (genre: string) => {
    setGameState(prev => ({ ...prev, genre, phase: 'setup_stats' }));
  };

  const handleStatsComplete = (stats: CharacterStats) => {
    setGameState(prev => ({ 
        ...prev, 
        stats, 
        startingStats: stats, 
        phase: 'playing' 
    }));
    processTurn("Begin the adventure.", null, null);
  };

  const handleChoiceClick = (choice: ChoiceData) => {
    if (gameState.isLoading || gameState.isRolling) return;

    if (choice.difficulty && choice.type) {
      setPendingChoice(choice);
      setGameState(prev => ({ ...prev, isRolling: true }));
    } else {
      processTurn(choice.text, null, null);
    }
  };

  const handleCustomChoiceSubmit = (text: string, itemId: string | null) => {
     if (gameState.customChoicesRemaining <= 0) return;
     if (isHeroicBlocked) {
         alert("You cannot perform Heroic Actions right now due to a status effect!");
         return;
     }
     
     let itemName = "None";
     if (itemId) {
         const allItems = [...gameState.inventory];
         if (gameState.equipped.weapon) allItems.push(gameState.equipped.weapon);
         if (gameState.equipped.armor) allItems.push(gameState.equipped.armor);
         if (gameState.equipped.accessory) allItems.push(gameState.equipped.accessory);
         
         const found = allItems.find(i => i.id === itemId);
         if (found) itemName = found.name;
     }

     const roll = Math.floor(Math.random() * 20) + 1;
     setGameState(prev => ({ ...prev, customChoicesRemaining: prev.customChoicesRemaining - 1 }));
     processTurn(text, null, { text, item: itemName, roll });
  };

  const handleRollComplete = (rollBase: number) => {
    if (!pendingChoice || !pendingChoice.type || !pendingChoice.difficulty) return;

    const mod = getMod(currentStats[pendingChoice.type]);
    const total = rollBase + mod;
    const isSuccess = total >= pendingChoice.difficulty;
    const statType = pendingChoice.type;

    const result: RollResult = {
        base: rollBase,
        modifier: mod,
        total: total,
        isSuccess,
        statType: statType,
        difficulty: pendingChoice.difficulty
    };

    setGameState(prev => ({ ...prev, isRolling: false }));
    setPendingChoice(null);
    
    let levelUpEvent: LevelUpEvent | undefined = undefined;
    
    if (isSuccess) {
        setGameState(prev => {
            const currentExp = prev.statExperience[statType];
            const nextExp = currentExp + 1;
            
            if (nextExp >= EXP_THRESHOLD) {
                const oldValue = prev.stats[statType];
                const newValue = oldValue + 1;
                levelUpEvent = { stat: statType, oldValue, newValue };

                return {
                    ...prev,
                    statExperience: { ...prev.statExperience, [statType]: 0 },
                    stats: { ...prev.stats, [statType]: newValue }
                };
            } else {
                return {
                    ...prev,
                    statExperience: { ...prev.statExperience, [statType]: nextExp }
                };
            }
        });
    }

    setTimeout(() => {
        processTurn(pendingChoice.text, result, null, levelUpEvent);
    }, 0);
  };

  const processTurn = async (
      userText: string, 
      rollResult: RollResult | null, 
      customAction: { text: string, item: string, roll: number } | null,
      levelUpEvent?: LevelUpEvent
  ) => {
    
    const userTurn: StoryTurn = {
      id: Date.now().toString() + '-user',
      text: userText.replace(/\*/g, ''), // Clean asterisks for display history
      choices: [],
      isUserTurn: true,
      rollResult: rollResult || undefined,
      levelUpEvent: levelUpEvent
    };

    setGameState(prev => {
        const updatedEffects = (prev.activeEffects || [])
            .map(e => ({ ...e, duration: e.duration - 1 }))
            .filter(e => e.duration > 0);

        return {
          ...prev,
          history: [...prev.history, userTurn],
          isLoading: true,
          activeEffects: updatedEffects
        };
    });

    const decrementedEffects = (gameState.activeEffects || [])
        .map(e => ({ ...e, duration: e.duration - 1 }))
        .filter(e => e.duration > 0);

    const recentHistory = gameState.history
      .slice(-5)
      .map(t => {
        let entry = `${t.isUserTurn ? 'User' : 'DM'}: ${t.text}`;
        if (t.rollResult) {
            entry += ` [Rolled ${t.rollResult.total} on ${t.rollResult.statType} vs DC ${t.rollResult.difficulty}: ${t.rollResult.isSuccess ? 'Success' : 'Fail'}]`;
        }
        return entry;
      })
      .join('\n');

    const aiResponse = await generateStoryStep(
      recentHistory,
      userText,
      gameState.inventory,
      gameState.equipped,
      gameState.currentQuest,
      gameState.hp,
      currentStats,
      decrementedEffects,
      gameState.npcs,
      gameState.genre,
      rollResult,
      customAction,
      settings.storyModel,
      addLog // Pass logger
    );

    // Sanitize choices: 
    // 1. If type exists but difficulty is missing, add random DC
    // 2. If type is missing, try to infer it from text keywords
    if (aiResponse.choices) {
        aiResponse.choices = aiResponse.choices.map(c => {
            let type = c.type;
            let difficulty = c.difficulty;

            // Try to infer type if missing
            if (!type) {
                const inferred = inferStatFromText(c.text);
                if (inferred) {
                    type = inferred;
                }
            }

            // If we have a type (either from AI or inferred) but no difficulty, assign one
            if (type && (difficulty === undefined || difficulty === null)) {
                 // Random DC between 8 (Very Easy) and 12 (Moderate)
                 difficulty = 8 + Math.floor(Math.random() * 5);
            }

            return { ...c, type, difficulty };
        });
    }

    setGameState(prev => {
        const newItems: InventoryItem[] = (aiResponse.inventory_added || []).map(aiItem => {
            const factoryItem = createItemFromString(aiItem.name);
            return {
                ...factoryItem,
                description: aiItem.description || factoryItem.description
            };
        });

        let removedNames = (aiResponse.inventory_removed || []).map(n => n.toLowerCase());
        
        let newEquipped = { ...prev.equipped };
        let equippedUpdated = false;
        
        // --- Calculate final inventory ---
        let finalInventory = [...prev.inventory];
        finalInventory = [...finalInventory, ...newItems];
        finalInventory = finalInventory.filter(item => !removedNames.includes(item.name.toLowerCase()));

        // Enforce 8 item limit
        if (finalInventory.length > 8) {
             addLog('error', 'Inventory overflow! Some items were discarded.');
             finalInventory = finalInventory.slice(0, 8);
        }

        if (equippedUpdated) {
            const equippedIds = [
                newEquipped.weapon?.id, 
                newEquipped.armor?.id, 
                newEquipped.accessory?.id
            ].filter(Boolean);
            
            finalInventory = finalInventory.filter(i => !equippedIds.includes(i.id));

            const oldEquippedList = [prev.equipped.weapon, prev.equipped.armor, prev.equipped.accessory].filter(Boolean) as InventoryItem[];
            
            oldEquippedList.forEach(oldItem => {
                const stillEquipped = equippedIds.includes(oldItem.id);
                const destroyed = removedNames.includes(oldItem.name.toLowerCase());
                
                if (!stillEquipped && !destroyed) {
                    if (!finalInventory.find(i => i.id === oldItem.id)) {
                        finalInventory.push(oldItem);
                    }
                }
            });
        }
        
        // Check destroyed equipped items
        if (newEquipped.weapon && removedNames.includes(newEquipped.weapon.name.toLowerCase())) { newEquipped.weapon = null; equippedUpdated = true; }
        if (newEquipped.armor && removedNames.includes(newEquipped.armor.name.toLowerCase())) { newEquipped.armor = null; equippedUpdated = true; }
        if (newEquipped.accessory && removedNames.includes(newEquipped.accessory.name.toLowerCase())) { newEquipped.accessory = null; equippedUpdated = true; }

        const hpChange = aiResponse.hp_change || 0;
        let newHp = Math.min(prev.maxHp, Math.max(0, prev.hp + hpChange));
        
        let status = aiResponse.game_status || 'ongoing';
        if (newHp <= 0) {
            status = 'lost';
            newHp = 0;
        }
        if (status !== 'ongoing') {
            setTimeout(() => setGameState(p => ({...p, phase: 'game_over'})), 1000);
        }

        let newStats = { ...prev.stats };
        let finalStatsUpdate: Partial<CharacterStats> | undefined = undefined;
        let finalStatExp = { ...prev.statExperience };
        
        if (aiResponse.stats_update) {
            finalStatsUpdate = {};
            const keys = Object.keys(aiResponse.stats_update) as Array<keyof CharacterStats>;
            keys.forEach(key => {
                let val = aiResponse.stats_update![key] || 0;
                if (val > 5) val = 5; 
                if (val < -2) val = -2;
                if (val !== 0) {
                    finalStatsUpdate![key] = val;
                    newStats[key] += val;
                }
            });
            if (Object.keys(finalStatsUpdate).length === 0) finalStatsUpdate = undefined;
        }

        const brandNewEffects: StatusEffect[] = (aiResponse.new_effects || []).map(e => ({
            ...e,
            id: Math.random().toString(36).substring(7)
        }));
        
        const finalActiveEffects = [...prev.activeEffects, ...brandNewEffects];

        // Process NPCs
        let currentNPCs = [...prev.npcs];
        const npcAdd = aiResponse.npcs_update?.add || [];
        const npcUpdate = aiResponse.npcs_update?.update || [];
        const npcRemove = aiResponse.npcs_update?.remove || [];

        npcAdd.forEach(n => {
            currentNPCs.push({ ...n, id: Math.random().toString(36).substr(2, 9) } as NPC);
        });

        npcUpdate.forEach(u => {
            const index = currentNPCs.findIndex(n => n.name.toLowerCase() === u.name.toLowerCase());
            if (index !== -1) {
                currentNPCs[index] = { 
                    ...currentNPCs[index], 
                    condition: u.condition as any,
                    type: u.status ? u.status as any : currentNPCs[index].type
                };
            }
        });

        currentNPCs = currentNPCs.filter(n => !npcRemove.includes(n.name));

        let customActionLevelUp: LevelUpEvent | undefined = undefined;
        let customActionRollResult: RollResult | undefined = undefined;

        if (aiResponse.action_result) {
            const { stat, is_success, total, difficulty, base_roll } = aiResponse.action_result;
            
            const mod = total - base_roll;
            customActionRollResult = {
                statType: stat,
                total,
                difficulty,
                base: base_roll,
                modifier: mod,
                isSuccess: is_success
            };

            if (is_success) {
                const currentExp = finalStatExp[stat];
                const nextExp = currentExp + 1;
                
                if (nextExp >= EXP_THRESHOLD) {
                    const oldValue = newStats[stat];
                    newStats[stat] = oldValue + 1; 
                    finalStatExp[stat] = 0;
                    customActionLevelUp = { stat, oldValue, newValue: oldValue + 1 };
                } else {
                    finalStatExp[stat] = nextExp;
                }
            }
        }

        const aiTurn: StoryTurn = {
            id: Date.now().toString() + '-ai',
            text: aiResponse.narrative,
            choices: aiResponse.choices,
            // No per-turn image
            isUserTurn: false,
            statsUpdated: finalStatsUpdate, 
            inventoryAdded: newItems,
            inventoryRemoved: aiResponse.inventory_removed,
            newEffects: brandNewEffects.length > 0 ? brandNewEffects : undefined,
            rollResult: customActionRollResult,
            levelUpEvent: customActionLevelUp,
            npcUpdates: npcAdd 
        };

        return {
            ...prev,
            history: [...prev.history, aiTurn],
            inventory: finalInventory,
            equipped: equippedUpdated ? newEquipped : prev.equipped,
            activeEffects: finalActiveEffects,
            currentQuest: aiResponse.quest_update || prev.currentQuest,
            npcs: currentNPCs,
            isLoading: false,
            hp: newHp,
            hpHistory: [...prev.hpHistory, newHp],
            stats: newStats,
            statExperience: finalStatExp,
            gameStatus: status as any,
            phase: status === 'ongoing' ? 'playing' : 'game_over'
        };
    });

    setCurrentChoices(aiResponse.choices || []);
  };

  const handleRegenerateImage = () => {
      if (!gameState.finalSummary) return;
      
      addLog('request', 'User requested image regeneration. Trying to create image...');
      setGameState(prev => ({ ...prev, finalStoryboard: undefined }));
      
      generateStoryboard(gameState.finalSummary, addLog).then(imageUrl => {
          if (imageUrl) {
              setGameState(prev => ({ ...prev, finalStoryboard: imageUrl }));
          }
      });
  };

  const handleRestart = () => {
    setGameState({
        inventory: [],
        equipped: { weapon: null, armor: null, accessory: null },
        currentQuest: "",
        npcs: [],
        history: [],
        isLoading: false,
        isRolling: false,
        hp: BASE_HP,
        maxHp: BASE_HP,
        hpHistory: [BASE_HP],
        gameStatus: 'ongoing',
        phase: 'menu', 
        genre: 'Fantasy',
        stats: DEFAULT_STATS,
        statExperience: { STR: 0, DEX: 0, CON: 0, INT: 0, CHA: 0 },
        activeEffects: [],
        startingStats: DEFAULT_STATS,
        customChoicesRemaining: 3,
        finalSummary: undefined,
        finalStoryboard: undefined
    });
    setCurrentChoices([]);
  };

  const handleSaveGame = () => {
    const saveData: SaveData = {
        gameState,
        currentChoices,
        settings,
        timestamp: Date.now(),
        version: "1.5"
    };
    
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adventure-save-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadGame = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result as string;
            const data = JSON.parse(text) as SaveData;
            
            if (!data.gameState || !data.currentChoices) {
                alert("Invalid save file format.");
                return;
            }
            
            setGameState(prev => ({
                ...data.gameState,
                npcs: data.gameState.npcs || [],
                finalStoryboard: data.gameState.finalStoryboard
            }));
            setCurrentChoices(data.currentChoices);
            if (data.settings) setSettings(data.settings);
        } catch (err) {
            console.error("Failed to load game", err);
            alert("Failed to load save file.");
        }
    };
    reader.readAsText(file);
  };
  
  const handleDownloadLog = () => {
    const logContent = gameState.history.map(turn => {
      if (turn.isUserTurn) {
        let line = `> USER: ${turn.text}`;
        if (turn.rollResult) line += ` [ROLL: ${turn.rollResult.total} vs DC ${turn.rollResult.difficulty}]`;
        if (turn.levelUpEvent) line += ` [LEVEL UP: ${turn.levelUpEvent.stat} ${turn.levelUpEvent.oldValue}->${turn.levelUpEvent.newValue}]`;
        return line + '\n';
      } else {
        return `DM: ${turn.text}\n-------------------\n`;
      }
    }).join('\n');

    const finalSummary = gameState.finalSummary ? `\n=== EPILOGUE ===\n${gameState.finalSummary}\n` : '';

    const blob = new Blob([logContent + finalSummary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adventure-log-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderChoiceText = (text: string, type?: StatType) => {
    if (!type) return <span className="text-zinc-300 font-serif text-base leading-relaxed">{text}</span>;

    const statConfig = getStatConfig(type);
    const parts = text.split(/\*(.*?)\*/g);

    return (
      <span className="text-zinc-300 font-serif text-base leading-relaxed">
        {parts.map((part, i) => {
          if (i % 2 === 1) {
             return (
               <span key={i} className={`${statConfig.color} font-bold cinzel tracking-wide border-b border-dashed border-zinc-700/50 pb-0.5`}>
                 {part}
               </span>
             )
          }
          return <span key={i}>{part}</span>
        })}
      </span>
    );
  };

  return (
    <div 
      className="flex h-screen bg-black text-zinc-100 font-sans overflow-hidden relative transition-all duration-300"
      style={{ zoom: settings.uiScale || 1 }}
    >
      
      {/* --- Settings Button --- */}
      <button
        onClick={() => setShowSettings(true)}
        className="fixed top-4 right-4 z-[60] p-2 bg-zinc-800/80 backdrop-blur hover:bg-zinc-700 rounded-full text-zinc-400 border border-zinc-700 transition-colors"
      >
        <Settings size={20} />
      </button>

      {/* --- Dice Roller Overlay --- */}
      {gameState.isRolling && pendingChoice && pendingChoice.type && (
        <DiceRoller
          modifier={getMod(currentStats[pendingChoice.type])}
          target={pendingChoice.difficulty || 10}
          statLabel={pendingChoice.type}
          onComplete={handleRollComplete}
        />
      )}

      {/* --- Main Menu Phase --- */}
      {gameState.phase === 'menu' && (
        <MainMenu onNewGame={handleNewGame} onLoadGame={handleLoadGame} />
      )}

      {/* --- Setup Phases --- */}
      {gameState.phase === 'setup_genre' && (
        <div className="flex-1 overflow-y-auto bg-zinc-950 w-full">
           <div className="pt-16 pb-12">
              <GenreSelect onSelect={handleGenreSelect} />
           </div>
        </div>
      )}

      {gameState.phase === 'setup_stats' && (
        <div className="flex-1 overflow-y-auto bg-zinc-950 flex items-center w-full">
           <div className="w-full pt-12">
             <StatBuilder onComplete={handleStatsComplete} />
           </div>
        </div>
      )}

      {/* --- Main Gameplay UI --- */}
      {(gameState.phase === 'playing' || gameState.phase === 'game_over') && (
        <>
          {/* Mobile Toggles */}
          <button 
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
            className="fixed top-4 left-4 z-50 md:hidden p-2 bg-zinc-800 rounded-md text-zinc-400 border border-zinc-700 shadow-lg"
          >
            <User size={20} />
          </button>
          
          <button 
            onClick={() => setShowRightSidebar(!showRightSidebar)}
            className="fixed top-4 right-16 z-50 md:hidden p-2 bg-zinc-800 rounded-md text-zinc-400 border border-zinc-700 shadow-lg"
          >
            <Backpack size={20} />
          </button>

          <LeftSidebar 
            stats={currentStats}
            baseStats={gameState.stats}
            hp={gameState.hp}
            maxHp={gameState.maxHp}
            activeEffects={gameState.activeEffects}
            equipped={gameState.equipped}
            inventory={gameState.inventory}
            isOpen={showLeftSidebar}
            onEquip={handleEquip}
            onUnequip={handleUnequip}
            highlightedStat={hoveredStat}
          />

          <main className="flex-1 flex flex-col relative w-full h-full max-w-5xl mx-auto bg-zinc-950 border-x border-zinc-900 shadow-2xl z-10">
            <StoryFeed history={gameState.history} isThinking={gameState.isLoading} />

            <div className={`
                p-4 md:p-6 z-20 sticky bottom-0 transition-all duration-500
                ${gameState.phase === 'game_over' ? 'bg-zinc-950/95 border-t border-zinc-800 backdrop-blur-lg h-[80vh] overflow-y-auto absolute bottom-0 w-full' : 'bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent'}
            `}>
              <div className="max-w-4xl mx-auto">
                 {gameState.phase !== 'game_over' ? (
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {currentChoices.map((choice, idx) => {
                            const statVal = choice.type ? currentStats[choice.type] : 0;
                            const risk = (choice.type && choice.difficulty) 
                                ? getRiskAssessment(choice.difficulty, statVal) 
                                : null;
                            
                            const riskColor = risk ? getRiskColorHSL(risk.chance) : '#71717a';
                            const statConfig = choice.type ? getStatConfig(choice.type) : null;
                            const borderHoverClass = statConfig ? statConfig.borderHover : 'hover:border-zinc-500';
                            const bgHoverClass = statConfig ? statConfig.bgHover : 'hover:bg-zinc-800/20';

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleChoiceClick(choice)}
                                    disabled={gameState.isLoading || gameState.isRolling}
                                    onMouseEnter={() => setHoveredStat(choice.type || null)}
                                    onMouseLeave={() => setHoveredStat(null)}
                                    className={`
                                        group relative flex flex-col text-left
                                        bg-transparent backdrop-blur-sm transition-all duration-200
                                        rounded-lg overflow-hidden border border-zinc-800
                                        ${borderHoverClass} ${bgHoverClass}
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                    `}
                                >
                                     <div className="p-4 pb-8 relative z-10">
                                        {/* Stat Label Badge (Top Left) */}
                                        {choice.type && (
                                            <div className={`mb-1 text-[9px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1 ${statConfig?.color}`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                {statConfig?.label} Check
                                            </div>
                                        )}

                                        <div className="leading-snug">
                                            {renderChoiceText(choice.text, choice.type)}
                                        </div>
                                     </div>

                                     {/* Integrated Footer Progress Bar */}
                                     {risk && choice.difficulty ? (
                                        <div className="absolute bottom-0 left-0 right-0 h-6 bg-black/40 flex items-center px-4 border-t border-white/5">
                                            {/* Background fill */}
                                            <div 
                                                className="absolute left-0 top-0 bottom-0 opacity-20 transition-all duration-700 ease-out"
                                                style={{ width: `${risk.chance}%`, backgroundColor: riskColor }}
                                            />
                                            
                                            {/* Text */}
                                            <div className="relative z-10 w-full flex justify-between text-[9px] font-bold uppercase tracking-widest">
                                                <span className="flex items-center gap-2" style={{ color: riskColor }}>
                                                    {risk.label} 
                                                    <span className="opacity-50 font-mono">({Math.round(risk.chance)}%)</span>
                                                </span>
                                                <span className="text-zinc-500">DC {choice.difficulty}</span>
                                            </div>

                                            {/* Bottom thin line */}
                                            <div 
                                                className="absolute bottom-0 left-0 h-[2px] transition-all duration-700 ease-out shadow-[0_0_10px_currentColor]" 
                                                style={{ width: `${risk.chance}%`, backgroundColor: riskColor, color: riskColor }} 
                                            />
                                        </div>
                                     ) : (
                                        // Standard decoration for non-risk choices
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-zinc-700 to-transparent opacity-30 group-hover:opacity-100 transition-opacity" />
                                     )}
                                </button>
                            );
                        })}
                        </div>
                        
                        <button
                            onClick={() => setShowCustomChoice(true)}
                            disabled={gameState.customChoicesRemaining <= 0 || gameState.isLoading || isHeroicBlocked}
                            className={`
                                w-full py-3 px-6 border border-zinc-800 hover:border-amber-600/50 rounded-lg flex items-center justify-center gap-3
                                transition-all duration-300 group relative overflow-hidden
                                ${gameState.customChoicesRemaining > 0 && !isHeroicBlocked
                                    ? 'bg-zinc-900/50 hover:bg-zinc-900 text-amber-500' 
                                    : 'bg-zinc-900 text-zinc-600 opacity-50 cursor-not-allowed'}
                            `}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-900/10 via-transparent to-amber-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Sparkles size={16} className={gameState.customChoicesRemaining > 0 ? "text-amber-400 group-hover:animate-pulse" : ""} />
                            <span className="cinzel font-bold text-xs uppercase tracking-[0.2em] relative z-10">
                                Heroic Action
                                <span className="ml-2 opacity-60 text-[10px] normal-case font-sans tracking-normal border border-current px-1.5 py-0.5 rounded-full">
                                    {gameState.customChoicesRemaining} Left
                                </span>
                            </span>
                            {isHeroicBlocked && <span className="text-xs text-red-500 font-bold ml-2 animate-pulse">[BLOCKED]</span>}
                        </button>
                    </div>
                 ) : (
                   <GameOverScreen 
                      gameStatus={gameState.gameStatus}
                      history={gameState.history}
                      stats={currentStats}
                      startingStats={gameState.startingStats}
                      hpHistory={gameState.hpHistory}
                      maxHp={gameState.maxHp}
                      summary={gameState.finalSummary}
                      storyboardUrl={gameState.finalStoryboard}
                      onDownloadLog={handleDownloadLog}
                      onRestart={handleRestart}
                      onRegenerateImage={handleRegenerateImage}
                   />
                 )}
              </div>
            </div>
          </main>

          <RightSidebar
            currentQuest={gameState.currentQuest}
            inventory={gameState.inventory}
            equipped={gameState.equipped}
            npcs={gameState.npcs}
            isOpen={showRightSidebar}
            onEquip={handleEquip}
            onUnequip={handleUnequip}
            onDiscard={handleDiscard}
          />
        </>
      )}

      {/* Debug Toggle */}
      <button 
        onClick={() => setShowDebug(!showDebug)}
        className="fixed bottom-4 right-4 z-50 p-2 bg-zinc-900/80 text-zinc-500 hover:text-zinc-200 rounded-full border border-zinc-800 hover:border-zinc-600 transition-all"
        title="Toggle Debug Console"
      >
        <Terminal size={20} />
      </button>

      <DebugConsole 
        isOpen={showDebug} 
        logs={debugLogs} 
        onClose={() => setShowDebug(false)} 
        onClear={() => setDebugLogs([])}
      />

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        settings={settings}
        onUpdateSettings={setSettings}
        onSelectApiKey={handleSelectKey}
        hasApiKey={hasApiKey}
        onSaveGame={handleSaveGame}
        onLoadGame={handleLoadGame}
        onResetGame={handleRestart}
      />
      
      <CustomChoiceModal
        isOpen={showCustomChoice}
        onClose={() => setShowCustomChoice(false)}
        onSubmit={handleCustomChoiceSubmit}
        inventory={gameState.inventory}
        equipped={gameState.equipped}
        remainingUses={gameState.customChoicesRemaining}
      />
    </div>
  );
};

export default App;
