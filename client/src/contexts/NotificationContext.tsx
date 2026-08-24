import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  notify: (item: Omit<NotificationItem, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  remove: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const remove = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    ({ type, message, title, duration = 5000 }: Omit<NotificationItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newItem: NotificationItem = { id, type, message, title, duration };

      setNotifications((prev) => [...prev, newItem]);

      if (duration > 0) {
        setTimeout(() => {
          remove(id);
        }, duration);
      }
    },
    [remove]
  );

  const success = useCallback(
    (message: string, title?: string) => notify({ type: 'success', message, title }),
    [notify]
  );
  const error = useCallback(
    (message: string, title?: string) => notify({ type: 'error', message, title }),
    [notify]
  );
  const warning = useCallback(
    (message: string, title?: string) => notify({ type: 'warning', message, title }),
    [notify]
  );
  const info = useCallback(
    (message: string, title?: string) => notify({ type: 'info', message, title }),
    [notify]
  );

  return (
    <NotificationContext.Provider
      value={{ notifications, notify, success, error, warning, info, remove }}
    >
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {notifications.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-elevated border flex items-start gap-3 transition-all transform translate-y-0 bg-white ${
              item.type === 'error'
                ? 'border-sandalwood-300 text-sandalwood-950 bg-sandalwood-50/90'
                : item.type === 'warning'
                ? 'border-saffron-300 text-saffron-950 bg-saffron-50/90'
                : 'border-surface-border text-ink-900 bg-white'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {item.type === 'error' && <AlertCircle className="w-4 h-4 text-sandalwood-700" />}
              {item.type === 'warning' && <AlertTriangle className="w-4 h-4 text-saffron-700" />}
              {item.type === 'success' && <CheckCircle2 className="w-4 h-4 text-ink-800" />}
              {item.type === 'info' && <Info className="w-4 h-4 text-ink-600" />}
            </div>

            <div className="flex-1 space-y-0.5 text-xs">
              {item.title && <h5 className="font-serif font-bold text-sm tracking-tight">{item.title}</h5>}
              <p className="leading-relaxed opacity-90">{item.message}</p>
            </div>

            <button
              type="button"
              onClick={() => remove(item.id)}
              className="flex-shrink-0 text-ink-400 hover:text-ink-900 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
