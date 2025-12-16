import { ITodo, Todo } from "../models/todo.model";
import { AppError } from "../utils/app-error";

export class TodoService {
  async create(todo: Pick<ITodo, "title" | "description">): Promise<ITodo> {
    return await Todo.create({
      title: todo.title,
      description: todo.description,
      completed: false,
    });
  }

  async getAll(page: number = 1, limit: number = 10): Promise<{
    todos: ITodo[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  }> {
    const skip = (page - 1) * limit;
    
    const [todos, totalItems] = await Promise.all([
      Todo.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
      Todo.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      todos,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
      },
    };
  }

  async updateById(id: string, todo: ITodo): Promise<ITodo> {
    const updated = await Todo.findByIdAndUpdate(
      id,
      {
        completed: todo.completed,
        title: todo.title,
        description: todo.description,
      },
      { new: true }
    );
    if (!updated) {
      throw new AppError("Todo not found", 400);
    }

    return updated;
  }

  async getUserById(id: string): Promise<ITodo> {
    const todo = await Todo.findById(id);
    if (!todo) throw new AppError("Todo not found", 400);
    return todo;
  }

  async deleteUser(id: string): Promise<ITodo | null> {
    const todo = await Todo.findByIdAndDelete(id);
    if (!todo) throw new AppError("Todo not found", 400);
    return todo;
  }
}
