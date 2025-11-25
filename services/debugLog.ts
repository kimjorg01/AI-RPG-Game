
export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'request' | 'response' | 'error';
  endpoint: string;
  model: string;
  content: any;
}

type Listener = (logs: LogEntry[]) => void;

class DebugLogService {
  private logs: LogEntry[] = [];
  private listeners: Listener[] = [];

  addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    const newLog = {
      ...entry,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now()
    };
    this.logs = [newLog, ...this.logs].slice(0, 50); // Keep last 50
    this.notify();
  }

  getLogs() {
    return this.logs;
  }

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    // Send current logs immediately upon subscription
    listener(this.logs);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.logs));
  }
  
  clear() {
      this.logs = [];
      this.notify();
  }
}

export const debugLog = new DebugLogService();
