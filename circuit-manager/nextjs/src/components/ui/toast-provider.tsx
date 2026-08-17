'use client';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { type Toast, useToastState } from '@/hooks/useToast';

function ToastItem({ toast }: { toast: Toast }) {
  const icons = {
    success: <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />,
    destructive: <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />,
    default: <Info className="w-4 h-4 text-primary flex-shrink-0" />,
  };
  const icon = icons[toast.variant || 'default'];

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg bg-card min-w-[300px] max-w-[400px] animate-in
      ${toast.variant === 'destructive' ? 'border-destructive/30' : 'border-border'}`}>
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.description && <p className="text-xs text-muted-foreground mt-0.5">{toast.description}</p>}
      </div>
    </div>
  );
}

export function ToastProvider() {
  const toasts = useToastState();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => <ToastItem key={toast.id} toast={toast} />)}
    </div>
  );
}
