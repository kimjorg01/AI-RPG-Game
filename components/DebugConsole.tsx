import React, { useState, useEffect } from 'react';
import { debugLog, LogEntry } from '../services/debugLog';
import { Bug, X, Trash2, ChevronDown, ChevronRight, Copy } from 'lucide-react';

export const DebugConsole: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = debugLog.subscribe(setLogs);
    return unsubscribe;
  }, []);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedLogs(newExpanded);
  };

  const copyToClipboard = (content: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    navigator.clipboard.writeText(text);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[100] p-3 bg-zinc-900/90 text-red-500 border border-red-900/50 rounded-full shadow-lg hover:bg-zinc-800 transition-all hover:scale-110"
        title="Debug Console"
      >
        <Bug size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-[90vw] md:w-[600px] h-[60vh] md:h-[500px] bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl flex flex-col overflow-hidden font-mono text-xs animate-in slide-in-from-bottom-10 fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-zinc-900 border-b border-zinc-800 select-none">
        <div className="flex items-center gap-2 text-zinc-400 font-bold">
          <Bug size={14} className="text-red-500" />
          <span>Debug Console</span>
          <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-zinc-500">{logs.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => debugLog.clear()} className="p-1.5 hover:bg-red-900/30 hover:text-red-400 text-zinc-500 rounded transition-colors" title="Clear Logs">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-zinc-800 hover:text-white text-zinc-500 rounded transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Log List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-black/50 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {logs.map(log => (
          <div key={log.id} className="border border-zinc-800 rounded bg-zinc-900/30 overflow-hidden transition-colors hover:border-zinc-700">
            <div 
              className="flex items-center gap-2 p-2 cursor-pointer hover:bg-zinc-800/50 select-none"
              onClick={() => toggleExpand(log.id)}
            >
              {expandedLogs.has(log.id) ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />}
              
              <span className={`uppercase font-bold text-[9px] px-1.5 py-0.5 rounded tracking-wider ${
                log.type === 'request' ? 'bg-blue-950 text-blue-400 border border-blue-900/50' : 
                log.type === 'response' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/50' : 
                'bg-red-950 text-red-400 border border-red-900/50'
              }`}>
                {log.type}
              </span>
              
              <span className="text-zinc-500 tabular-nums">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <span className="text-zinc-300 truncate flex-1 font-semibold">{log.endpoint}</span>
              <span className="text-zinc-600 text-[10px] border border-zinc-800 px-1 rounded bg-zinc-900">{log.model}</span>
            </div>
            
            {expandedLogs.has(log.id) && (
              <div className="relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => copyToClipboard(log.content, e)}
                        className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded shadow-lg border border-zinc-700"
                        title="Copy to Clipboard"
                    >
                        <Copy size={12} />
                    </button>
                </div>
                <div className="p-3 border-t border-zinc-800 bg-black overflow-x-auto max-h-[300px]">
                  <pre className="text-zinc-400 whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed">
                    {typeof log.content === 'string' ? log.content : JSON.stringify(log.content, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
        {logs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-700 gap-2 py-12">
                <Bug size={32} className="opacity-20" />
                <span className="italic">No logs recorded yet...</span>
            </div>
        )}
      </div>
    </div>
  );
};
