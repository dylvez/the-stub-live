import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps): React.JSX.Element {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2
              md:w-full md:max-w-lg bg-stub-surface border border-stub-border
              rounded-2xl z-50 overflow-hidden shadow-2xl"
          >
            {title && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-stub-border">
                <h2 className="text-lg font-display font-bold text-stub-text">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-1 text-stub-muted hover:text-stub-text transition-colors rounded-lg hover:bg-stub-surface-hover"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
