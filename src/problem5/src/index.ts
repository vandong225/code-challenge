import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

import express, { Request, Response } from "express";
import { connectDB } from "./config/db";
import { errorHandler } from "./middlewares/exception.middleware";
import todoRoutes from './routes/todo.route'
import { notFound } from "./middlewares/not-found.middleware";


const main = async () => {
    const app = express();
    const port = process.env.PORT || 3000;
    
    app.use(express.json());
    
    await connectDB();
    
    
    app.get("/", (req: Request, res: Response) => {
        res.send("OK");
    });

    app.use("/todo", todoRoutes);

    app.use(notFound)
    app.use(errorHandler);
    
    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
}

main()