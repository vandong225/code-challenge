import { z } from "zod";

export const createTodoSchema = z.object({
  body: z.object({
    title: z.string().min(2, "Title must be at least 2 characters"),
    description: z.string().optional(),
  }),
});

export const updateTodoSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    completed: z.boolean().optional(),
  }),
});
