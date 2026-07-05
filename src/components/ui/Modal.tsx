import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm p-0 md:items-center md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[32px] px-5 pb-5 pt-4 md:rounded-[32px] bg-white/70 dark:bg-black/50 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-2xl z-10"
            initial={{ y: 48, opacity: 0.7 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 48, opacity: 0.7 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-slate-300/80 md:hidden" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex size-10 items-center justify-center rounded-2xl bg-white/50 text-slate-600 transition hover:bg-white dark:bg-white/10 dark:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            {footer ? <div className="mt-4 flex flex-wrap gap-3">{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
