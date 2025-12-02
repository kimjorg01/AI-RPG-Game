
import React, { useRef } from 'react';
import { AppSettings, ImageSize, StoryModel, UIScale } from '../types';
import { X, Settings, Image as ImageIcon, Zap, Brain, Save, Upload, RotateCcw, AlertTriangle, Monitor, ZoomIn, Activity, BrainCircuit, Dices } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onSelectApiKey: () => void;
  hasApiKey: boolean;
  onSaveGame: () => void;
  onLoadGame: (file: File) => void;
  onResetGame: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onUpdateSettings,
  onSelectApiKey,
  hasApiKey,
  onSaveGame,
  onLoadGame,
  onResetGame
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadGame(file);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-4xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-8 cinzel flex items-center gap-2 text-amber-500 border-b border-zinc-800 pb-4">
          <Settings size={24} />
          Adventure Settings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN */}
          <div className="space-y-8">
              
              {/* --- Game Data Management --- */}
              <div className="space-y-4">
                <h3 className="font-bold text-zinc-200 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Save size={16} /> Game Data
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <button 
                    onClick={onSaveGame}
                    className="flex flex-col items-center gap-2 p-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors text-zinc-300"
                    >
                    <Save size={20} className="text-emerald-500" />
                    <span className="text-xs font-bold">Save Adventure</span>
                    </button>
                    
                    <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors text-zinc-300"
                    >
                    <Upload size={20} className="text-blue-500" />
                    <span className="text-xs font-bold">Load Adventure</span>
                    </button>
                    <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".json" 
                    className="hidden" 
                    />
                </div>

                <button 
                onClick={() => {
                    if(window.confirm("Are you sure? This will wipe your current progress and return to the main menu.")) {
                    onResetGame();
                    onClose();
                    }
                }}
                className="w-full mt-2 flex items-center justify-center gap-2 p-3 bg-red-900/10 hover:bg-red-900/30 border border-red-900/30 rounded transition-colors text-red-400"
                >
                <RotateCcw size={16} />
                <span className="text-xs font-bold">Reset Campaign</span>
                </button>
              </div>

              {/* Gameplay Settings */}
              <div className="space-y-4">
                <h3 className="font-bold text-zinc-200 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Dices size={16} /> Gameplay
                </h3>
                <div className="flex items-center justify-between bg-zinc-800 p-4 rounded border border-zinc-700">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-200">Enable Dice Rolling</span>
                        <span className="text-xs text-zinc-500">If disabled, choices succeed automatically.</span>
                    </div>
                    <button
                        onClick={() => onUpdateSettings({ ...settings, enableDiceRolls: !settings.enableDiceRolls })}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                            settings.enableDiceRolls ? 'bg-amber-600' : 'bg-zinc-600'
                        }`}
                    >
                        <span
                            className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                                settings.enableDiceRolls ? 'translate-x-6' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>
              </div>

          {/* UI Scaling */}
          <div className="pb-6 border-b border-zinc-800">
             <h3 className="font-bold text-zinc-200 text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                 <Monitor size={16} /> Interface Size
             </h3>
             <div className="grid grid-cols-3 gap-2">
                 <button
                    onClick={() => onUpdateSettings({ ...settings, uiScale: UIScale.Compact })}
                    className={`p-2 text-sm rounded border transition-all ${
                        settings.uiScale === UIScale.Compact
                        ? 'bg-amber-900/40 border-amber-500 text-amber-200' 
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    }`}
                 >
                     Compact
                 </button>
                 <button
                    onClick={() => onUpdateSettings({ ...settings, uiScale: UIScale.Normal })}
                    className={`p-2 text-sm rounded border transition-all ${
                        settings.uiScale === UIScale.Normal
                        ? 'bg-amber-900/40 border-amber-500 text-amber-200' 
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    }`}
                 >
                     Normal
                 </button>
                 <button
                    onClick={() => onUpdateSettings({ ...settings, uiScale: UIScale.Large })}
                    className={`p-2 text-sm rounded border transition-all ${
                        settings.uiScale === UIScale.Large
                        ? 'bg-amber-900/40 border-amber-500 text-amber-200' 
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    }`}
                 >
                     Large
                 </button>
             </div>
          </div>

            {/* API Key Section */}
            <div className="space-y-4">
                <h3 className="font-bold text-zinc-200 text-sm uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon size={16} /> Image Generation
                </h3>
                <div className="bg-zinc-800 p-4 rounded-md border border-zinc-700">
                    <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                    High-quality storyboard generation requires a paid Google Cloud API Key (Gemini 3 Pro Image).
                    </p>
                    <button
                    onClick={onSelectApiKey}
                    className={`w-full py-3 px-4 rounded font-bold transition-colors text-sm ${
                        hasApiKey 
                        ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-600/50 cursor-default'
                        : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg'
                    }`}
                    >
                    {hasApiKey ? 'API Key Active' : 'Select Paid API Key'}
                    </button>
                    {!hasApiKey && (
                    <a 
                        href="https://ai.google.dev/gemini-api/docs/billing" 
                        target="_blank" 
                        rel="noreferrer"
                        className="block mt-3 text-[10px] text-blue-400 hover:underline text-center uppercase tracking-wider"
                    >
                        View Billing Documentation
                    </a>
                    )}
                </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
