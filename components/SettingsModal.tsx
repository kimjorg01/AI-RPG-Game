
import React, { useRef } from 'react';
import { AppSettings, ImageSize, StoryModel, UIScale } from '../types';
import { X, Settings, Image as ImageIcon, Zap, Brain, Save, Upload, RotateCcw, AlertTriangle, Monitor, ZoomIn } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4 overflow-hidden">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-md p-4 md:p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-2xl font-bold cinzel flex items-center gap-2 text-amber-500">
            <Settings size={24} />
            Adventure Settings
          </h2>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar">
          
          {/* --- Game Data Management --- */}
          <div className="space-y-3 pb-6 border-b border-zinc-800">
             <h3 className="font-bold text-zinc-200 text-sm uppercase tracking-wider mb-2">Game Data</h3>
             <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={onSaveGame}
                  className="flex flex-col items-center gap-2 p-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors text-zinc-300"
                >
                   <Save size={20} className="text-emerald-500" />
                   <span className="text-xs font-bold">Save Adventure</span>
                </button>
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors text-zinc-300"
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
               className="w-full mt-2 flex items-center justify-center gap-2 p-3 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 rounded transition-colors text-red-400"
             >
               <RotateCcw size={16} />
               <span className="text-xs font-bold">Reset Campaign</span>
             </button>
          </div>

          {/* UI Scaling */}
          <div className="pb-6 border-b border-zinc-800">
             <h3 className="font-bold text-zinc-200 text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                 <Monitor size={16} /> Interface Size
             </h3>
             <div className="flex items-center gap-4">
                 <ZoomIn size={16} className="text-zinc-500" />
                 <input 
                    type="range" 
                    min="0.5" 
                    max="1.5" 
                    step="0.05"
                    value={settings.uiScale || 1}
                    onChange={(e) => onUpdateSettings({ ...settings, uiScale: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                 />
                 <span className="text-xs font-mono text-zinc-400 w-12 text-right">
                     {Math.round((settings.uiScale || 1) * 100)}%
                 </span>
             </div>
             <div className="flex justify-between text-[10px] text-zinc-600 mt-1 px-1">
                 <span>Tiny</span>
                 <span>Normal</span>
                 <span>Huge</span>
             </div>
          </div>

          {/* API Key Section */}
          <div className="bg-zinc-800 p-4 rounded-md border border-zinc-700">
             <h3 className="font-bold text-zinc-200 mb-2">Google Cloud API Key</h3>
             <p className="text-sm text-zinc-400 mb-4">
               Required for Storyboard Generation (Gemini 3 Pro Image).
             </p>
             <button
               onClick={onSelectApiKey}
               className={`w-full py-2 px-4 rounded font-bold transition-colors ${
                 hasApiKey 
                   ? 'bg-green-600/20 text-green-400 border border-green-600/50 cursor-default'
                   : 'bg-amber-600 hover:bg-amber-500 text-white'
               }`}
             >
               {hasApiKey ? 'API Key Active' : 'Select Paid API Key'}
             </button>
             {!hasApiKey && (
               <a 
                 href="https://ai.google.dev/gemini-api/docs/billing" 
                 target="_blank" 
                 rel="noreferrer"
                 className="block mt-2 text-xs text-blue-400 hover:underline text-center"
               >
                 View Billing Documentation
               </a>
             )}
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-zinc-400 text-sm font-bold mb-2">Story Engine Model</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onUpdateSettings({ ...settings, storyModel: StoryModel.Fast })}
                className={`p-3 rounded border flex flex-col items-center gap-2 transition-all ${
                  settings.storyModel === StoryModel.Fast 
                    ? 'bg-amber-900/40 border-amber-500 text-amber-200' 
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'
                }`}
              >
                <Zap size={20} />
                <span className="font-bold">Fast & Cheap</span>
                <span className="text-xs opacity-70">Gemini 2.5 Flash</span>
              </button>
              <button
                onClick={() => onUpdateSettings({ ...settings, storyModel: StoryModel.Smart })}
                className={`p-3 rounded border flex flex-col items-center gap-2 transition-all ${
                  settings.storyModel === StoryModel.Smart 
                    ? 'bg-amber-900/40 border-amber-500 text-amber-200' 
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'
                }`}
              >
                <Brain size={20} />
                <span className="font-bold">Smart (Default)</span>
                <span className="text-xs opacity-70">Gemini 3 Pro</span>
              </button>
              
              {/* Local Models */}
              <button
                onClick={() => onUpdateSettings({ ...settings, storyModel: StoryModel.LocalQwen })}
                className={`p-3 rounded border flex flex-col items-center gap-2 transition-all ${
                  settings.storyModel === StoryModel.LocalQwen 
                    ? 'bg-amber-900/40 border-amber-500 text-amber-200' 
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'
                }`}
              >
                <Monitor size={20} />
                <span className="font-bold">Local Qwen</span>
                <span className="text-xs opacity-70">qwen3:8b (Ollama)</span>
              </button>
              <button
                onClick={() => onUpdateSettings({ ...settings, storyModel: StoryModel.LocalGemma })}
                className={`p-3 rounded border flex flex-col items-center gap-2 transition-all ${
                  settings.storyModel === StoryModel.LocalGemma 
                    ? 'bg-amber-900/40 border-amber-500 text-amber-200' 
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'
                }`}
              >
                <Monitor size={20} />
                <span className="font-bold">Local Gemma</span>
                <span className="text-xs opacity-70">gemma3:27b (Ollama)</span>
              </button>
              <button
                onClick={() => onUpdateSettings({ ...settings, storyModel: StoryModel.LocalQwenCoder })}
                className={`p-3 rounded border flex flex-col items-center gap-2 transition-all ${
                  settings.storyModel === StoryModel.LocalQwenCoder 
                    ? 'bg-amber-900/40 border-amber-500 text-amber-200' 
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'
                }`}
              >
                <Monitor size={20} />
                <span className="font-bold">Local Qwen Coder</span>
                <span className="text-xs opacity-70">qwen3-coder:30b</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-zinc-600 text-center pt-4">
              Images are generated only at the end of the adventure.
          </div>

        </div>
      </div>
    </div>
  );
};
