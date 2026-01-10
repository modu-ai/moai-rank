import { z } from 'zod';

/**
 * User Zod schemas for validation
 */

export const UserSchema = z.object({
  id: z.string().uuid(),
  clerkId: z.string().min(1),
  email: z.string().email(),
  username: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateUserSchema = UserSchema.partial().omit({
  id: true,
  clerkId: true,
  createdAt: true,
  updatedAt: true,
});

export const SessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  clerkSessionId: z.string().min(1),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().nullable(),
  isActive: z.boolean(),
});

export const CreateSessionSchema = SessionSchema.omit({
  id: true,
  endedAt: true,
}).extend({
  isActive: z.boolean().default(true),
});

export type UserSchemaType = z.infer<typeof UserSchema>;
export type CreateUserSchemaType = z.infer<typeof CreateUserSchema>;
export type UpdateUserSchemaType = z.infer<typeof UpdateUserSchema>;
export type SessionSchemaType = z.infer<typeof SessionSchema>;
export type CreateSessionSchemaType = z.infer<typeof CreateSessionSchema>;
