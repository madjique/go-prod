import type { Task } from '../db/models'

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent':
      return '#ef4444'
    case 'high':
      return '#f97316'
    case 'medium':
      return '#6366f1'
    default:
      return '#10b981'
  }
}

export function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'Urgent'
    case 'high':
      return 'High'
    case 'medium':
      return 'Medium'
    case 'low':
      return 'Low'
    default:
      return priority
  }
}

export const priorityRank: Record<Task['priority'], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}
