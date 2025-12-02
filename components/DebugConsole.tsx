
import React, { useEffect, useRef, useState } from 'react';
import { X, Terminal, ArrowDown, ArrowUp, AlertTriangle, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'request' | 'response' | 'error' | 'info';
  content: any;
}

interface DebugConsoleProps {
  logs: LogEntry[];
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({ logs, isOpen, onClose, onClear }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && endRef.current) {
      // Optional: scroll to bottom on open
    }
  }, [isOpen]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col rounded-xl overflow-hidden font-mono text-sm ring-1 ring-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800 backdrop-blur">
          <div className="flex items-center gap-3 text-zinc-300">
            <div className="p-1.5 bg-zinc-800 rounded-md">
              <Terminal size={18} />
            </div>
            <div>
              <h2 className="font-bold text-base tracking-tight">Debug Console</h2>
              <div className="text-xs text-zinc-500 flex items-center gap-2">
                <span className="bg-zinc-800/50 px-1.5 py-0.5 rounded text-zinc-400">{logs.length} events</span>
                <span>•</span>
                <span>Gemini 3 Pro (Preview)</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClear}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-red-900/30 hover:text-red-400 text-zinc-400 rounded-md transition-all border border-transparent hover:border-red-900/50"
              title="Clear all logs"
            >
              <Trash2 size={14} />
              Clear
            </button>
            <div className="w-px h-6 bg-zinc-800 mx-1"></div>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Logs Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-black/40">
          {logs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
              <Terminal size={48} className="opacity-20" />
              <p className="italic">No logs recorded yet...</p>
            </div>
          )}
          
          {logs.map((log) => {
            const isExpanded = expandedIds.has(log.id);
            const isError = log.type === 'error';
            const isRequest = log.type === 'request';
            const isResponse = log.type === 'response';

            return (
              <div 
                key={log.id} 
                className={`
                  border rounded-lg overflow-hidden transition-all duration-200
                  ${isExpanded ? 'bg-zinc-900/40 border-zinc-700 shadow-lg' : 'bg-zinc-900/20 border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900/40'}
                `}
              >
                <button
                  onClick={() => toggleExpand(log.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left group"
                >
                  <div className={`
                    transition-transform duration-200 text-zinc-500 group-hover:text-zinc-300
                    ${isExpanded ? 'rotate-90' : ''}
                  `}>
                    <ChevronRight size={16} />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-600 text-xs font-medium tabular-nums">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      
                      <span className={`
                        flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full border
                        ${isRequest ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                        ${isResponse ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                        ${isError ? 'bg-red-500/10 text-red-400 border-red-500/20' : ''}
                      `}>
                        {isRequest && <ArrowUp size={12} />}
                        {isResponse && <ArrowDown size={12} />}
                        {isError && <AlertTriangle size={12} />}
                        {log.type.toUpperCase()}
                      </span>
                    </div>

                    <span className="text-zinc-500 text-xs truncate opacity-70 font-medium">
                      {typeof log.content === 'string' 
                        ? log.content.substring(0, 80).replace(/\n/g, ' ') 
                        : JSON.stringify(log.content).substring(0, 80)
                      }
                      {(typeof log.content === 'string' ? log.content.length : JSON.stringify(log.content).length) > 80 ? '...' : ''}
                    </span>
                  </div>
                </button>
                
                {isExpanded && (
                  <div className={`
                    border-t border-zinc-800/50 text-xs
                    ${isRequest ? 'bg-blue-950/5' : ''}
                    ${isResponse ? 'bg-emerald-950/5' : ''}
                    ${isError ? 'bg-red-950/5' : ''}
                  `}>
                    <div className="p-4 overflow-x-auto">
                      <pre className={`
                        font-mono whitespace-pre-wrap break-words leading-relaxed
                        ${isRequest ? 'text-blue-200/90' : ''}
                        ${isResponse ? 'text-emerald-200/90' : ''}
                        ${isError ? 'text-red-200/90' : ''}
                      `}>
                        {typeof log.content === 'string' ? log.content : JSON.stringify(log.content, null, 2)}
                      </pre>
                    </div>
                    <div className="px-4 py-2 bg-black/20 border-t border-zinc-800/30 flex justify-end">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(typeof log.content === 'string' ? log.content : JSON.stringify(log.content, null, 2));
                        }}
                        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        Copy to Clipboard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
};
