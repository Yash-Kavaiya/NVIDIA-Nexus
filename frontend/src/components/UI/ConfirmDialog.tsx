import { X, AlertTriangle, Trash2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  type = 'warning',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const colors = {
    danger: {
      icon: 'text-red-500',
      bg: 'bg-red-500/10',
      button: 'bg-red-500 hover:bg-red-600',
    },
    warning: {
      icon: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      button: 'bg-yellow-500 hover:bg-yellow-600 text-nvidia-black',
    },
    info: {
      icon: 'text-nvidia-green',
      bg: 'bg-nvidia-green/10',
      button: 'nvidia-button',
    },
  };

  const color = colors[type];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-nvidia-dark border border-nvidia-gray-light rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-nvidia-gray-light">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color.bg}`}>
                {type === 'danger' ? (
                  <Trash2 className={`w-5 h-5 ${color.icon}`} />
                ) : type === 'warning' ? (
                  <AlertTriangle className={`w-5 h-5 ${color.icon}`} />
                ) : (
                  <CheckCircle className={`w-5 h-5 ${color.icon}`} />
                )}
              </div>
              <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            <button
              onClick={onCancel}
              className="p-2 rounded-lg hover:bg-nvidia-gray transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-nvidia-text-secondary">{message}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-nvidia-gray-light bg-nvidia-gray/20">
            <button
              onClick={onCancel}
              className="nvidia-button-secondary"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${color.button}`}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
