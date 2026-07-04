import type { ButtonHTMLAttributes } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '../../utils/cn'

export function FAB({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'fixed bottom-24 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-2xl shadow-indigo-500/30 transition hover:bg-indigo-500 active:scale-95 md:right-8',
        className,
      )}
      {...props}
    >
      <Plus className="size-6" />
    </button>
  )
}
