'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Check, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'info', isVisible, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const bgColors = {
    success: 'bg-[#00e054]/90',
    error: 'bg-red-500/90',
    info: 'bg-blue-500/90'
  };

  const icons = {
    success: <Check className="w-4 h-4 text-black" />,
    error: <AlertCircle className="w-4 h-4 text-white" />,
    info: <Info className="w-4 h-4 text-white" />
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl backdrop-blur-md"
        >
          <div className={`${bgColors[type]} p-1 rounded-full shadow-lg`}>
            {icons[type]}
          </div>
          <span className={`text-sm font-bold ${type === 'success' ? 'text-black' : 'text-white'}`}>
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

