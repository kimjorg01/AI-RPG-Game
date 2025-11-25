
import React, { useState } from 'react';
import { InventoryItem, EquippedGear } from '../types';
import { X, Sparkles, Sword } from 'lucide-react';

interface CustomChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string, itemId: string | null) => void;
  inventory: InventoryItem[];
  equipped: EquippedGear;
  remainingUses: number;
}

export const CustomChoiceModal: React.FC<CustomChoiceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  inventory,
  equipped,
  remainingUses
}) => {
  const [text, setText] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string>("");

  if (!isOpen) return null;

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const isOverLimit = wordCount > 15;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text && !isOverLimit) {
      onSubmit(text, selectedItemId || null);
      setText("");
      setSelectedItemId("");
      onClose();
    }
  };

  // Combine items for dropdown
  const allItems = [
    ...(equipped.weapon ? [equipped.weapon] : []),
    ...(equipped.armor ? [equipped.armor] : []),
    ...(equipped.accessory ? [equipped.accessory] : []),
    ...inventory
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4">
      <div className="bg-zinc-900 border-2 border-amber-600/50 rounded-lg w-full max-w-lg p-6 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white"
        >
          <X size={24} />
        </button>

        <div className="flex items-center gap-3 mb-6">
           <div className="p-2 bg-amber-900/30 rounded-full border border-amber-600/50">
             <Sparkles size={24} className="text-amber-400" />
           </div>
           <div>
               <h2 className="text-2xl font-bold cinzel text-amber-500">Heroic Action</h2>
               <p className="text-xs text-zinc-400">Forge your own destiny.</p>
           </div>
           <div className="ml-auto flex flex-col items-end">
               <span className="text-2xl font-bold font-mono text-zinc-200">{remainingUses}</span>
               <span className="text-[10px] uppercase text-zinc-500">Uses Left</span>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
           
           {/* Text Input */}
           <div>
               <label className="block text-zinc-400 text-sm font-bold mb-2">
                   What do you want to do?
               </label>
               <textarea 
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. I try to swing from the chandelier and kick the goblin..."
                  className={`w-full h-24 bg-zinc-950 border rounded-md p-3 text-zinc-200 focus:outline-none resize-none transition-colors ${isOverLimit ? 'border-red-500 focus:border-red-500' : 'border-zinc-700 focus:border-amber-500'}`}
               />
               <div className={`text-right text-xs mt-1 ${isOverLimit ? 'text-red-500 font-bold' : 'text-zinc-500'}`}>
                   {wordCount}/15 Words
               </div>
           </div>

           {/* Item Selection */}
           <div>
               <label className="block text-zinc-400 text-sm font-bold mb-2">
                   Use an Item? (Optional)
               </label>
               <select 
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-md p-3 text-zinc-200 focus:outline-none focus:border-amber-500"
               >
                   <option value="">No Item / Body Only</option>
                   {allItems.map((item, idx) => (
                       <option key={`${item.id}-${idx}`} value={item.id}>
                           {item.name} {item.bonuses ? `(${Object.keys(item.bonuses)[0]} +${Object.values(item.bonuses)[0]})` : ''}
                       </option>
                   ))}
               </select>
           </div>

           <button 
             type="submit"
             disabled={!text.trim() || isOverLimit || remainingUses <= 0}
             className="w-full py-4 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white rounded font-bold cinzel text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
           >
             Attempt Action
           </button>
        </form>
      </div>
    </div>
  );
};
