import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-indigo-500',
  secondary: 'bg-secondary text-white hover:bg-violet-500',
  danger: 'bg-red-500 text-white hover:bg-red-400',
  ghost: 'glass text-slate-700 hover:bg-white/60 dark:text-slate-100 dark:hover:bg-white/10',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 rounded-2xl px-3 text-sm',
  md: 'h-11 rounded-2xl px-4 text-sm',
  lg: 'h-12 rounded-2xl px-5 text-base',
  icon: 'size-11 rounded-2xl',
}

export function GlassButton({
  className,
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}: GlassButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
