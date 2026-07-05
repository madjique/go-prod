import type { ButtonHTMLAttributes } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '../../utils/cn'

export function FAB({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'fixed bottom-[calc(env(safe-area-inset-bottom,0px)+82px)] right-4 z-40 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-[0_8px_24px_rgba(99,102,241,0.35)] dark:shadow-[0_8px_24px_rgba(139,92,246,0.3)] border border-white/20 hover:brightness-105 active:scale-95 transition-all duration-300 md:right-8',
        className,
      )}
      {...props}
    >
      <Plus className="size-6" />
    </button>
  )
}
