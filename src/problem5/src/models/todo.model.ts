import mongoose, { Schema, Document } from "mongoose";

export interface ITodo extends Document {
  title: string;
  description?: string;
  completed: boolean;
}


const todoSchema = new Schema<ITodo>(
  {
    title: { type: String, required: true },
    description: { type: String, required: false },
    completed: { type: Boolean, required: true },
  },
  { timestamps: true }
);

export const Todo = mongoose.model<ITodo>("Todo", todoSchema);
