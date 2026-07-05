import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('glass rounded-[28px] p-4', className)} {...props} />
}
