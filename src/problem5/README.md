# Todo API Application

A RESTful API application built with Express.js, TypeScript, and MongoDB for managing todo items.

## Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v18.20.0 or higher recommended)
- **npm** (v10.5.0 or higher)
- **MongoDB** (running locally or accessible MongoDB instance)

## Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd code-challenge/src/problem5
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

### Environment Variables

The application uses environment variables for configuration. Create a `.env` file in the root directory of the project (same level as `package.json`) based on the `.env.example` file:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Server Configuration
PORT=3000

# MongoDB Configuration
MONGO_URI=mongodb://127.0.0.1:27017/mydb
```

### Environment Variables Explained

- **PORT** (optional, default: 3000): The port number on which the server will run
- **MONGO_URI** (optional, default: mongodb://127.0.0.1:27017/mydb): MongoDB connection string

## Running the Application

### Development Mode

Run the application in development mode with hot-reload using nodemon:

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

### Production Mode

1. Build the TypeScript code:
   ```bash
   npm run build
   ```

2. Start the application:
   ```bash
   npm start
   ```

## API Endpoints

### Base URL
```
http://localhost:3000
```

### Health Check
- **GET** `/` - Returns "OK" to verify the server is running

### Todo Endpoints

#### Create a Todo
- **POST** `/todo`
- **Request Body:**
  ```json
  {
    "title": "My Todo Item",
    "description": "Optional description"
  }
  ```
- **Response:** Created todo object

#### Get All Todos
- **GET** `/todo`
- **Query Parameters:**
  - `page` (optional, default: 1): Page number (must be greater than 0)
  - `limit` (optional, default: 10): Number of items per page (must be between 1 and 100)
- **Example Request:**
  ```
  GET /todo?page=1&limit=10
  GET /todo?page=2&limit=20
  ```
- **Response:**
  ```json
  {
    "todos": [
      {
        "_id": "...",
        "title": "Todo Item 1",
        "description": "Description",
        "completed": false,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  }
  ```
- **Note:** Results are sorted by creation date (newest first)

#### Get Todo by ID
- **GET** `/todo/:id`
- **Response:** Todo object with the specified ID

#### Update Todo
- **PATCH** `/todo/:id`
- **Request Body:**
  ```json
  {
    "title": "Updated Title",
    "description": "Updated description",
    "completed": true
  }
  ```
- **Note:** All fields are optional in the request body
- **Response:** Updated todo object

#### Delete Todo
- **DELETE** `/todo/:id`
- **Response:**
  ```json
  {
    "message": "Deleted successfully"
  }
  ```

## Project Structure

```
problem5/
├── src/
│   ├── config/
│   │   └── db.ts              # MongoDB connection configuration
│   ├── middlewares/
│   │   ├── exception.middleware.ts    # Error handling middleware
│   │   ├── not-found.middleware.ts    # 404 handler
│   │   └── validate.middleware.ts     # Request validation middleware
│   ├── models/
│   │   └── todo.model.ts      # Todo Mongoose model
│   ├── routes/
│   │   └── todo.route.ts      # Todo API routes
│   ├── services/
│   │   └── todo.service.ts    # Todo business logic
│   ├── utils/
│   │   ├── app-error.ts       # Custom error class
│   │   └── catch-sync.ts      # Async error handler utility
│   ├── validators/
│   │   └── todo.validator.ts  # Zod validation schemas
│   └── index.ts               # Application entry point
├── .env.example               # Example environment variables
├── .gitignore                 # Git ignore file
├── package.json               # Project dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## Technologies Used

- **Express.js** - Web framework
- **TypeScript** - Type-safe JavaScript
- **MongoDB** - Database (via Mongoose)
- **Zod** - Schema validation
- **dotenv** - Environment variable management

## Scripts

- `npm run dev` - Start development server with hot-reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled application
- `npm test` - Run tests (not configured)

## Notes

- The application automatically connects to MongoDB on startup
- All API endpoints use JSON for request/response
- Validation is performed using Zod schemas
- Error handling is centralized through middleware
- The application includes automatic timestamps for todos (createdAt, updatedAt)

