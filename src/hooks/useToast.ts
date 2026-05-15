import { useToastStore } from '@/stores/toast-store';

export function useToast() {
  const add = useToastStore((s) => s.add);

  return {
    toast: (message: string, type?: 'success' | 'error' | 'info') => add(message, type),
    success: (message: string) => add(message, 'success'),
    error: (message: string) => add(message, 'error'),
    info: (message: string) => add(message, 'info'),
  };
}
