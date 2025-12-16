# CURL Testing Guide

This document provides curl commands to test all API endpoints in the Todo API application.

## Prerequisites

- The server should be running on `http://localhost:3000` (or your configured PORT)
- MongoDB should be running and accessible

## Base URL

```
http://localhost:3000
```

## Health Check

### Check Server Status

```bash
curl -X GET http://localhost:3000/
```

**Expected Response:**
```
OK
```

---

## Todo API Endpoints

### 1. Create a Todo

**Endpoint:** `POST /todo`

**Request:**
```bash
curl -X POST http://localhost:3000/todo \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete project documentation",
    "description": "Write comprehensive API documentation"
  }'
```

**Minimal Request (without description):**
```bash
curl -X POST http://localhost:3000/todo \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Buy groceries"
  }'
```

**Expected Response:**
```json
{
  "_id": "...",
  "title": "Complete project documentation",
  "description": "Write comprehensive API documentation",
  "completed": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Cases:**

- Invalid title (too short):
```bash
curl -X POST http://localhost:3000/todo \
  -H "Content-Type: application/json" \
  -d '{
    "title": "A"
  }'
```

- Missing title:
```bash
curl -X POST http://localhost:3000/todo \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Missing title"
  }'
```

---

### 2. Get All Todos

**Endpoint:** `GET /todo`

**Basic Request (default pagination):**
```bash
curl -X GET http://localhost:3000/todo
```

**With Pagination:**
```bash
curl -X GET "http://localhost:3000/todo?page=1&limit=10"
```

**Custom Pagination:**
```bash
curl -X GET "http://localhost:3000/todo?page=2&limit=20"
```

**Expected Response:**
```json
{
  "todos": [
    {
      "_id": "...",
      "title": "Complete project documentation",
      "description": "Write comprehensive API documentation",
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

**Error Cases:**

- Invalid page (less than 1):
```bash
curl -X GET "http://localhost:3000/todo?page=0&limit=10"
```

- Invalid limit (less than 1):
```bash
curl -X GET "http://localhost:3000/todo?page=1&limit=0"
```

- Invalid limit (greater than 100):
```bash
curl -X GET "http://localhost:3000/todo?page=1&limit=101"
```

---

### 3. Get Todo by ID

**Endpoint:** `GET /todo/:id`

**Request:**
```bash
curl -X GET http://localhost:3000/todo/507f1f77bcf86cd799439011
```

**Note:** Replace `507f1f77bcf86cd799439011` with an actual todo ID from your database.

**Expected Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Complete project documentation",
  "description": "Write comprehensive API documentation",
  "completed": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Cases:**

- Todo not found:
```bash
curl -X GET http://localhost:3000/todo/507f1f77bcf86cd799439999
```

- Invalid ID format:
```bash
curl -X GET http://localhost:3000/todo/invalid-id
```

---

### 4. Update Todo

**Endpoint:** `PATCH /todo/:id`

**Update Title:**
```bash
curl -X PATCH http://localhost:3000/todo/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Todo Title"
  }'
```

**Update Description:**
```bash
curl -X PATCH http://localhost:3000/todo/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description"
  }'
```

**Mark as Completed:**
```bash
curl -X PATCH http://localhost:3000/todo/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "completed": true
  }'
```

**Update All Fields:**
```bash
curl -X PATCH http://localhost:3000/todo/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "description": "Updated description",
    "completed": true
  }'
```

**Expected Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Updated Title",
  "description": "Updated description",
  "completed": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T01:00:00.000Z"
}
```

**Error Cases:**

- Todo not found:
```bash
curl -X PATCH http://localhost:3000/todo/507f1f77bcf86cd799439999 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title"
  }'
```

- Invalid title (too short):
```bash
curl -X PATCH http://localhost:3000/todo/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "A"
  }'
```

---

### 5. Delete Todo

**Endpoint:** `DELETE /todo/:id`

**Request:**
```bash
curl -X DELETE http://localhost:3000/todo/507f1f77bcf86cd799439011
```

**Expected Response:**
```json
{
  "message": "Deleted successfully"
}
```

**Error Cases:**

- Todo not found:
```bash
curl -X DELETE http://localhost:3000/todo/507f1f77bcf86cd799439999
```

---

## Complete API Flow Example

Here's a complete flow demonstrating all CRUD operations in sequence:

### Step 1: Create a Todo
```bash
curl -X POST http://localhost:3000/todo \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Todo Item",
    "description": "This is a test todo item"
  }'
```

**Save the `_id` from the response for the next steps.**

### Step 2: Get All Todos
```bash
curl -X GET http://localhost:3000/todo
```

### Step 3: Get Todo by ID (use the ID from Step 1)
```bash
curl -X GET http://localhost:3000/todo/<TODO_ID>
```

### Step 4: Update Todo (use the ID from Step 1)
```bash
curl -X PATCH http://localhost:3000/todo/<TODO_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "completed": true,
    "title": "Updated Test Todo Item"
  }'
```

### Step 5: Delete Todo (use the ID from Step 1)
```bash
curl -X DELETE http://localhost:3000/todo/<TODO_ID>
```

### Step 6: Verify Deletion
```bash
curl -X GET http://localhost:3000/todo/<TODO_ID>
```
**Expected:** Error response indicating todo not found

---

## Testing Tips

1. **Using jq for Better Output:**
   ```bash
   curl -X GET http://localhost:3000/todo | jq
   ```

2. **Verbose Mode for Debugging:**
   ```bash
   curl -v -X POST http://localhost:3000/todo \
     -H "Content-Type: application/json" \
     -d '{"title": "Test"}'
   ```

3. **Save Response to File:**
   ```bash
   curl -X GET http://localhost:3000/todo -o response.json
   ```

4. **Pretty Print JSON (without jq):**
   ```bash
   curl -X GET http://localhost:3000/todo | python -m json.tool
   ```

---

## Common Issues

1. **Connection Refused:** Make sure the server is running on the correct port
2. **Invalid JSON:** Ensure proper JSON formatting in request bodies
3. **404 Not Found:** Check that the endpoint path is correct (should be `/todo`, not `/todos`)
4. **Validation Errors:** Check that required fields are present and meet validation requirements
5. **Invalid ID:** Ensure MongoDB ObjectID format is correct (24 hex characters)

