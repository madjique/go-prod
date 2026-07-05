export const agentTools = {
  getTasks: {
    description: 'Get tasks for a date or date range',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date in yyyy-MM-dd format' },
        endDate: { type: 'string', description: 'Optional end date in yyyy-MM-dd format' },
      },
      required: ['startDate'],
      additionalProperties: false,
    },
  },
  createTask: {
    description: 'Create a new task',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        date: { type: 'string', description: 'yyyy-MM-dd' },
        timeStart: { type: 'string', description: 'HH:mm' },
        timeEnd: { type: 'string', description: 'HH:mm' },
        categoryId: { type: 'number' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        color: { type: 'string' },
      },
      required: ['title', 'date'],
      additionalProperties: false,
    },
  },
  updateTask: {
    description: 'Update an existing task',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        title: { type: 'string' },
        description: { type: 'string' },
        date: { type: 'string' },
        timeStart: { type: 'string' },
        timeEnd: { type: 'string' },
        categoryId: { type: 'number' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        color: { type: 'string' },
        isDone: { type: 'boolean' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  deleteTask: {
    description: 'Delete a task by ID',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  markTaskDone: {
    description: 'Mark a task as done or undone',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        isDone: { type: 'boolean' },
      },
      required: ['id', 'isDone'],
      additionalProperties: false,
    },
  },
  getSummary: {
    description: 'Get summary of tasks for a period',
    parameters: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['day', 'week', 'month'] },
        date: { type: 'string', description: 'Anchor date in yyyy-MM-dd format' },
      },
      required: ['period', 'date'],
      additionalProperties: false,
    },
  },
  findFreeSlot: {
    description: 'Find a free time slot given task constraints and work/sleep hours',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'yyyy-MM-dd' },
        durationMinutes: { type: 'number' },
      },
      required: ['date', 'durationMinutes'],
      additionalProperties: false,
    },
  },
  getMemory: {
    description: 'Get relevant memory context',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  updateMemory: {
    description: 'Store important information to memory',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        value: { type: 'string' },
        importance: { type: 'number', minimum: 1, maximum: 10 },
        category: {
          type: 'string',
          enum: ['preference', 'context', 'goal', 'fact'],
        },
      },
      required: ['key', 'value', 'importance', 'category'],
      additionalProperties: false,
    },
  },
}
