import { Router, Request, Response } from "express";
import { catchAsync } from "../utils/catch-sync";
import { TodoService } from "../services/todo.service";
import { createTodoSchema, updateTodoSchema } from "../validators/todo.validator";
import { validate } from "../middlewares/validate.middleware";
import { AppError } from "../utils/app-error";

const router = Router();
const userService = new TodoService();

router.post(
  "/",
  validate(createTodoSchema),
  catchAsync(async (req: Request, res: Response) => {
    const user = await userService.create(req.body);
    res.status(201).json(user);
  })
);
router.get(
  "/",
  catchAsync(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Validate pagination parameters
    if (page < 1) {
      throw new AppError("Page must be greater than 0", 400);
    }
    if (limit < 1 || limit > 100) {
      throw new AppError("Limit must be between 1 and 100", 400);
    }
    
    const result = await userService.getAll(page, limit);
    res.status(200).json(result);
  })
);
router.get(
  "/:id",
  catchAsync(async (req: Request, res: Response) => {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json(user);
  })
);
router.patch(
  "/:id",
  validate(updateTodoSchema),
  catchAsync(async (req: Request, res: Response) => {
    const todo = req.body
    const user = await userService.updateById(req.params.id, todo);
    res.status(200).json(user);
  })
);

router.delete(
  "/:id",
  catchAsync(async (req: Request, res: Response) => {
    await userService.deleteUser(req.params.id);
    res.status(200).json({ message: "Deleted successfully" });
  })
);

export default router;
