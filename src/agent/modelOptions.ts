import type { AppSettings } from '../db/models'

export const aiModelOptions: Record<AppSettings['aiProvider'], string[]> = {
  openai: ['gpt-4o', 'gpt-4.1-mini', 'gpt-4o-mini'],
  google: ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  anthropic: ['claude-3-5-sonnet-latest', 'claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest'],
}
