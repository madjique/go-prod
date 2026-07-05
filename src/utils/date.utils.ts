import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay as dateFnsIsSameDay,
  isToday as dateFnsIsToday,
  parse,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

function parseDate(value: Date | string) {
  return typeof value === 'string' ? parseISO(value) : value
}

export function formatDate(date: Date | string): string {
  return format(parseDate(date), 'yyyy-MM-dd')
}

export function formatTime(time: string): string {
  return format(parse(time, 'HH:mm', new Date()), 'h:mm a')
}

export function getWeekDays(date: string): string[] {
  const target = parseISO(date)
  const weekStart = startOfWeek(target, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(target, { weekStartsOn: 1 })
  return eachDayOfInterval({ start: weekStart, end: weekEnd }).map((day) => format(day, 'yyyy-MM-dd'))
}

export function getMonthWeeks(date: string): Array<string[]> {
  const target = parseISO(date)
  const monthStart = startOfMonth(target)
  const monthEnd = endOfMonth(target)
  const cursor = startOfWeek(monthStart, { weekStartsOn: 1 })
  const finalDay = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const weeks: Array<string[]> = []
  let current = cursor

  while (current <= finalDay) {
    weeks.push(
      Array.from({ length: 7 }, (_, index) => format(addDays(current, index), 'yyyy-MM-dd')),
    )
    current = addDays(current, 7)
  }

  return weeks
}

export function isSameDay(a: string, b: string): boolean {
  return dateFnsIsSameDay(parseISO(a), parseISO(b))
}

export function isToday(date: string): boolean {
  return dateFnsIsToday(parseISO(date))
}

export function formatDayLabel(date: string): string {
  return format(parseISO(date), 'EEEE, MMMM d, yyyy')
}

export function formatMonthLabel(date: string): string {
  return format(parseISO(date), 'MMMM yyyy')
}

export function formatWeekLabel(startDate: string): string {
  const start = parseISO(startDate)
  const end = addDays(start, 6)
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
}
