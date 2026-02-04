import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: 'bg-nvidia-green/10 border-nvidia-green text-nvidia-green',
  error: 'bg-red-500/10 border-red-500 text-red-400',
  info: 'bg-blue-500/10 border-blue-500 text-blue-400',
  warning: 'bg-yellow-500/10 border-yellow-500 text-yellow-400',
};

export default function Toast({ id, type, message, duration = 5000, onClose }: ToastProps) {
  const [progress, setProgress] = useState(100);
  const Icon = icons[type];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          onClose(id);
          return 0;
        }
        return prev - (100 / (duration / 100));
      });
    }, 100);

    return () => clearInterval(timer);
  }, [id, duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className={`relative flex items-center gap-3 px-4 py-3 rounded-lg border ${colors[type]} shadow-lg min-w-[300px] max-w-md`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="p-1 rounded hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 rounded-b-lg overflow-hidden">
        <motion.div
          className="h-full bg-current"
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}
