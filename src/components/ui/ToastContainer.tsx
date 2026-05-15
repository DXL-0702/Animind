'use client';

import { useState, useEffect } from 'react';
import { useToastStore } from '@/stores/toast-store';

const typeClasses: Record<string, string> = {
  success: 'alert-success',
  error: 'alert-error',
  info: 'alert-info',
};

interface ToastItem {
  id: string;
  message: string;
  type: string;
  exiting: boolean;
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);
  const [displayToasts, setDisplayToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const currentIds = new Set(toasts.map((t) => t.id));
    setDisplayToasts((prev) => {
      const exiting = prev
        .filter((p) => !currentIds.has(p.id))
        .map((p) => ({ ...p, exiting: true }));
      const staying = prev.filter((p) => currentIds.has(p.id));
      const newOnes = toasts
        .filter((t) => !prev.some((p) => p.id === t.id))
        .map((t) => ({ ...t, exiting: false }));
      return [...staying, ...newOnes, ...exiting];
    });
  }, [toasts]);

  const handleRemove = (id: string) => {
    setDisplayToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => remove(id), 250);
  };

  if (displayToasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {displayToasts.map((toast) => (
        <div
          key={toast.id}
          className={`alert ${typeClasses[toast.type] || 'alert-info'} shadow-lg cursor-pointer toast-enter ${toast.exiting ? 'toast-exit' : ''}`}
          onClick={() => handleRemove(toast.id)}
          role="alert"
        >
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
