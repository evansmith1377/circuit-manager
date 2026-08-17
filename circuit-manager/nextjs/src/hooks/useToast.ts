'use client';

import { useEffect, useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}

type Listener = (toasts: Toast[]) => void;
const listeners = new Set<Listener>();
let toasts: Toast[] = [];

function emit() {
  listeners.forEach(fn => fn([...toasts]));
}

export function addToast(toast: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { ...toast, id }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    emit();
  }, 4000);
}

export function useToastState(): Toast[] {
  const [state, setState] = useState<Toast[]>([]);
  useEffect(() => {
    listeners.add(setState);
    return () => { listeners.delete(setState); };
  }, []);
  return state;
}

export function useToast() {
  const toast = useCallback((opts: Omit<Toast, 'id'>) => addToast(opts), []);
  return { toast };
}
