export interface Task {
  id?: number;
  title: string;
  description?: string;
  date: string;
  timeStart?: string;
  timeEnd?: string;
  categoryId: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  color?: string;
  isDone: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id?: number;
  name: string;
  color: string;
  icon?: string;
}

export interface Conversation {
  id?: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  summary?: string;
}

export interface Message {
  id?: number;
  conversationId: number;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  toolCallId?: string;
  createdAt: string;
  tokenCount?: number;
  cost?: number;
}

export interface AgentMemory {
  id?: number;
  key: string;
  value: string;
  importance: number;
  updatedAt: string;
  category: 'preference' | 'context' | 'goal' | 'fact';
}

export interface AgentSummary {
  id?: number;
  conversationId: number;
  summary: string;
  period: string;
  tokensSaved: number;
  createdAt: string;
}

export interface AppSettings {
  id?: number;
  theme: 'light' | 'dark' | 'system';
  aiProvider: 'openai' | 'google' | 'anthropic';
  aiModel: string;
  apiKey: string;
  workStartHour: number;
  workEndHour: number;
  sleepStartHour: number;
  sleepEndHour: number;
  userProfile?: string;
  customPrompt?: string;
  onboardingCompleted: boolean;
  calendarAccess: boolean;
}

export interface CalendarEvent {
  id?: number;
  title: string;
  description?: string;
  date: string; // yyyy-MM-dd
  timeStart?: string; // HH:mm
  timeEnd?: string; // HH:mm
  source: 'ics' | 'device';
  createdAt: string;
}

