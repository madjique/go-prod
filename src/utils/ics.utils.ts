export interface ParsedICSResponse {
  title: string
  description?: string
  date: string // yyyy-MM-dd
  timeStart?: string // HH:mm
  timeEnd?: string // HH:mm
}

/**
 * Unfolds folded lines in an ICS file.
 * In ICS, lines longer than 75 octets are folded by inserting a newline followed by a space or tab.
 */
function unfoldICS(content: string): string {
  return content.replace(/\r?\n[ \t]/g, '')
}

/**
 * Parses a DTSTART or DTEND value from ICS into date (yyyy-MM-dd) and optional time (HH:mm).
 */
function parseICSDateTime(value: string): { date: string; time?: string } {
  const clean = value.replace(/[\s-:]/g, '') // remove dashes/colons if any
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/)
  
  if (!match) {
    // Fallback if formatting is weird
    return { date: value.slice(0, 10) }
  }

  const year = match[1]
  const month = match[2]
  const day = match[3]
  const hour = match[4]
  const minute = match[5]

  const dateStr = `${year}-${month}-${day}`
  if (hour && minute) {
    return {
      date: dateStr,
      time: `${hour}:${minute}`,
    }
  }

  return { date: dateStr }
}

/**
 * Parses raw ICS content into a list of events.
 */
export function parseICS(content: string): ParsedICSResponse[] {
  const unfolded = unfoldICS(content)
  const lines = unfolded.split(/\r?\n/)
  const events: ParsedICSResponse[] = []
  
  let currentEvent: Record<string, string> = {}
  let insideEvent = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed === 'BEGIN:VEVENT') {
      insideEvent = true
      currentEvent = {}
      continue
    }

    if (trimmed === 'END:VEVENT') {
      if (insideEvent) {
        insideEvent = false
        
        const summary = currentEvent['SUMMARY'] || 'Untitled Event'
        const description = currentEvent['DESCRIPTION']
        const dtstartRaw = currentEvent['DTSTART']
        const dtendRaw = currentEvent['DTEND']

        if (dtstartRaw) {
          const parsedStart = parseICSDateTime(dtstartRaw)
          const parsedEnd = dtendRaw ? parseICSDateTime(dtendRaw) : null
          
          events.push({
            title: summary.replace(/\\,/g, ',').replace(/\\;/g, ';'),
            description: description?.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';'),
            date: parsedStart.date,
            timeStart: parsedStart.time,
            timeEnd: parsedEnd?.time,
          })
        }
      }
      continue
    }

    if (insideEvent) {
      const colonIdx = trimmed.indexOf(':')
      if (colonIdx === -1) continue

      const keyPart = trimmed.substring(0, colonIdx)
      const valPart = trimmed.substring(colonIdx + 1)
      
      // Keys might look like DTSTART;VALUE=DATE:20260705
      const key = keyPart.split(';')[0].toUpperCase()
      currentEvent[key] = valPart
    }
  }

  return events
}
