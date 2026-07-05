import type { Category } from '../../db/models'

interface CategoryBadgeProps {
  category?: Category
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  if (!category) {
    return null
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/55 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-slate-100">
      <span className="size-2 rounded-full" style={{ backgroundColor: category.color }} />
      {category.name}
    </span>
  )
}
