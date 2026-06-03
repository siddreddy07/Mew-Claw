import { integer, pgTable, serial, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const roleEnum = pgEnum('role', ['user', 'assistant']);

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  telegramId: integer('telegram_id').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  username: text('username'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const messagesTable = pgTable('messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  chatId: integer('chat_id').notNull(),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  text: text('text').notNull(),
  toolName: text('tool_name'),
  toolResult: text('tool_result'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const telegramWebhookSchema = z.object({
  update_id: z.number(),
  message: z.object({
    message_id: z.number(),
    from: z.object({
      id: z.number(),
      is_bot: z.boolean(),
      first_name: z.string(),
      last_name: z.string().optional(),
      username: z.string().optional(),
      language_code: z.string().optional(),
    }),
    chat: z.object({
      id: z.number(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      username: z.string().optional(),
      type: z.string(),
    }),
    date: z.number(),
    text: z.string(),
  }),
});