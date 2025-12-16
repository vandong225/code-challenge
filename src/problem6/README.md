## Live Scoreboard Backend Module – Specification

### 1. Overview

This document specifies a backend module that powers a **live scoreboard** for a website.  
The module:
- **Tracks user scores**
- **Updates scores when users complete actions**
- **Serves a “Top 10” scoreboard**
- **Pushes live score updates to connected clients**
- **Prevents malicious score manipulation**

The target audience is a backend engineering team implementing this module as part of an existing API service.

---

### 2. Functional Requirements

- **Scoreboard**
  - Store and maintain a numeric score per user.
  - Provide an API to fetch the **top 10 users by score**, ordered descending.
  - Scores should be deterministic and consistent across requests.

- **Score Updates**
  - Provide an authenticated API to **increment a user’s score** when a business action is completed.
  - The exact action is out of scope; we assume some upstream service (frontend or another backend) knows when an action is completed.

- **Live Updates**
  - Connected clients should see **near real-time** updates on the scoreboard (e.g., sub-second to a few seconds latency).
  - When a score changes in a way that affects the Top 10, connected scoreboard clients should be notified/pushed an update.

- **Security / Anti‑Abuse**
  - Only **authorised callers** may increase scores.
  - Prevent clients from arbitrarily setting or inflating scores (e.g., cannot choose delta directly, cannot call for other users).
  - Provide mechanisms to mitigate replay attacks and brute-force attempts (rate limiting, idempotency where appropriate).

---

### 3. Non‑Functional Requirements

- **Performance**
  - Top 10 query should be optimised to be **O(1) or log(N)** with respect to the total number of users (e.g. using an index, cache, or sorted data structure).
  - Target **p95 latency \< 150 ms** for `GET /scoreboard/top` under normal load.

- **Scalability**
  - Support at least tens of thousands of concurrent scoreboard viewers using WebSockets or Server‑Sent Events (SSE).
  - The design should be horizontally scalable at the API layer (stateless where possible).

- **Reliability**
  - Score updates must be **atomic** and **durable**.
  - In case of temporary failures, API should respond with clear error codes and not double‑count an action.

- **Observability**
  - Metrics: number of updates, failures, latency, number of concurrent connections to live channel, and rate-limit hits.
  - Logs: audit log entries for all score modifications.

---

### 4. High‑Level Architecture

- **Core Components**
  - **API Gateway / HTTP Layer**
    - Handles HTTP requests for score updates and scoreboard retrieval.
    - Manages authentication, authorization, and rate limiting.
  - **Score Service**
    - Encapsulates business logic for reading/updating scores and computing the Top 10.
  - **Persistence Layer**
    - Primary DB (e.g. relational DB or key‑value store) storing per-user scores.
    - Optional in‑memory cache (e.g. Redis) to optimise Top 10 queries and live updates.
  - **Real‑Time Notification Layer**
    - WebSocket or SSE server managing live connections and broadcasting scoreboard updates.
  - **Audit / Security Layer**
    - Logs all score-changing operations with user and caller identity.
    - Enforces anti‑abuse and fraud checks (rate limiting, integrity validation).

---

### 5. Data Model (Conceptual)

Minimal schema (relational-style for clarity; actual schema can be adapted to chosen DB):

- **Table: `users`** (existing or reference table; not owned by this module)
  - `id` (PK)
  - Other user attributes (not needed by this module).

- **Table: `user_scores`**
  - `user_id` (PK, FK → `users.id`)
  - `score` (BIGINT / INT, default 0, non‑negative)
  - `updated_at` (timestamp)
  - Optional: `version` (integer) for optimistic locking if required.

- **Table: `score_events`** (for auditing and optional replay/analytics)
  - `id` (PK)
  - `user_id`
  - `delta` (integer; positive increments only for now)
  - `reason` (string / enum, e.g. `"ACTION_COMPLETED"`)
  - `context_id` (string; e.g. action ID or external event ID, used for idempotency)
  - `created_at` (timestamp)
  - `created_by` (caller identity/service)

**Indexes / Optimisation:**
- Index on `user_scores.score DESC` to support Top 10 queries efficiently.
- Index on `score_events.context_id` (unique) to enforce idempotency and prevent double counting.

---

### 6. API Design

#### 6.1 Authentication & Authorization

- All **write** operations (score updates) require:
  - **Service-to-service authentication** (e.g., OAuth2 client credentials, signed JWT from trusted backend, or API key restricted to backend).
  - Optional: Additional validation of the acting user (e.g., user ID in JWT claims).
- **Read** operations for the public scoreboard can be:
  - Public (no auth) if scores are non-sensitive; or
  - Authenticated if business rules require it.

**Key Security Principles:**
- The client **must not** be able to:
  - Choose an arbitrary `delta` value.
  - Specify any `user_id` it wants; this should come from a **trusted context** (e.g., auth token on a backend call).
- All write endpoints should be **protected behind server-side logic**: the frontend should not call the score increment endpoint directly with raw parameters, but rather trigger a trusted backend that validates the action.

---

#### 6.2 Endpoints

##### 6.2.1 Get Top 10 Scoreboard

- **Method**: `GET`
- **Path**: `/scoreboard/top`
- **Auth**: Optional (configurable)
- **Query Parameters**:
  - `limit` (optional, integer, default: 10, max: 50) – allows generic “top N”, but UI will use 10.
- **Response** `200 OK`:
  ```json
  {
    "entries": [
      {
        "userId": "123",
        "displayName": "Alice",        // optional; may come from user profile service
        "score": 1500,
        "rank": 1
      }
      // ...
    ],
    "generatedAt": "2025-12-15T12:34:56.000Z"
  }
  ```
- **Error Responses**:
  - `500` – internal error (log details internally).

**Implementation Notes:**
- Use either:
  - A **materialized view / cached sorted set** (e.g. Redis `ZSET` for scores), or
  - A DB query with proper indexing and caching of the Top 10 result for a short TTL (e.g. 1–5 seconds).

---

##### 6.2.2 Increment User Score (trusted caller only)

- **Method**: `POST`
- **Path**: `/scores/increment`
- **Auth**: Required (trusted backend / service caller)
- **Request Body**:
  ```json
  {
    "userId": "123",
    "actionId": "action-uuid-123",    // unique ID for the completed action
    "reason": "ACTION_COMPLETED"      // optional enum/string
  }
  ```
  - `userId`: The user whose score should be incremented.
  - `actionId`: Unique identifier for the action/event. Used to ensure idempotency (i.e. the same action cannot increment the score twice).
  - `reason`: Optional tag for auditing.

- **Response** `200 OK`:
  ```json
  {
    "userId": "123",
    "newScore": 1510,
    "delta": 10,
    "applied": true,                  // false if this was a duplicate actionId
    "actionId": "action-uuid-123"
  }
  ```
- **Error Responses**:
  - `400` – invalid payload.
  - `401 / 403` – unauthenticated/unauthorised caller.
  - `409` – optional, if `actionId` has already been processed and policy is to signal conflict.
  - `429` – rate limited.
  - `500` – internal error.

**Important Security Constraints:**
- The **score increment amount (`delta`) is not provided by the client**.
  - It is derived by server-side configuration or from the action type.
  - For this challenge, assume a fixed configurable delta per action (e.g., `+10` per valid action).
- Endpoint must:
  - Validate `actionId` uniqueness (idempotency) in `score_events`.
  - Ensure `userId` is valid and authorised in the caller context (e.g., the authenticated caller is allowed to update this user).

---

### 7. Live Update Mechanism

The module should provide a **push-based** mechanism so that clients see the latest scoreboard without polling.

#### 7.1 Transport Choice

Two main options:
- **WebSockets** (recommended if the platform already supports it)
  - Full-duplex; suitable for bi-directional communication and future features (e.g., room subscriptions, per-user updates).
- **Server‑Sent Events (SSE)**
  - Simpler, unidirectional (server → client); well-suited for streaming scoreboard updates.

For this specification, we’ll assume **WebSockets**, but the interface can be adapted to SSE with minimal change at the backend.

#### 7.2 WebSocket Channel

- **Endpoint**: `GET /ws/scoreboard`
  - Upgraded to WebSocket.
- **Auth**: Optional or required, depending on whether the scoreboard is public.
- **Subscription Model**:
  - On connection, the client is automatically subscribed to a **global scoreboard channel** (e.g., `channel = "scoreboard:top"`).
  - In the future, the design can support more granular channels (e.g., per‑user or per‑group leaderboards).

- **Message Format**
  - On initial connection, server sends the **current Top 10**:
    ```json
    {
      "type": "scoreboard_snapshot",
      "entries": [ /* same structure as GET /scoreboard/top */ ],
      "generatedAt": "2025-12-15T12:34:56.000Z"
    }
    ```
  - On subsequent updates (e.g. when any score update changes the Top 10), server sends:
    ```json
    {
      "type": "scoreboard_update",
      "entries": [ /* updated Top 10 */ ],
      "generatedAt": "2025-12-15T12:35:01.000Z"
    }
    ```

**Server Behaviour:**
- On each **successful score increment**:
  1. Update the persistent store (DB and/or cache).
  2. Determine if the Top 10 has changed since last broadcast.
  3. If changed, push a `scoreboard_update` message to all connected scoreboard clients.
- Implement a **debounce / coalescing mechanism** to avoid overloading clients with rapid updates (e.g. broadcast at most once every 250 ms).

---

### 8. Execution Flow Diagram

The following diagram shows the primary flow when a user completes an action that increases their score, and how the scoreboard is updated and broadcast.

```text
+------------+        +----------------------+       +------------------+       +-------------------+       +-------------------+       +-------------------+
|  Browser   |        | Frontend            |       |  API Gateway     |       |   Score Service   |       |   DB / Cache      |       | WebSocket Layer   |
|  (User)    |        |                     |       |  (Auth + Routing)|       | (Business Logic)  |       | (Scores + Top 10) |       | (Live Updates)    |
+-----+------+        +----------+-----------+       +---------+--------+       +---------+---------+       +---------+---------+       +---------+---------+
      |                          |                           |                          |                           |                           |
      |                          |                           |                          |                           |                           |
      |<------------------------- WebSocket Connection (established on page load) ------------------------------------------------------------->|
      |                          |                           |                          |                           |                           |
1. User completes action         |                           |                          |                           |                           |
      |                          |                           |                          |                           |                           |
2. Action event (internal) ----->|                           |                          |                           |                           |
      |                          |                           |                          |                           |                           |
      |             3. Validate action,                      |                          |                           |                           |
      |             determine user & score rules             |                          |                           |                           |
      |                          |                           |                          |                           |                           |
      |             4. POST /scores/increment                |                          |                           |                           |
      |             (userId, actionId) --------------------> |                          |                           |                           |
      |                          |                           |                          |                           |                           |
      |                          |            5. AuthN/Z, rate limiting,                |                           |                           |
      |                          |                route to score service                |                           |                           |
      |                          |                           |                          |                           |                           |
      |                          |                            ---> 6. Validate user, check idempotency (actionId)   |                           |
      |                          |                                                      |                           |                           |
      |                          |                                                      v                           |                           |
      |                          |                                 7. Update user_scores (atomic increment) ------->|                           |
      |                          |                                                      |                           |                           |
      |                          |                                                      |<------------------ 8. New score,                      |
      |                          |                                                      |                possibly new Top 10                    |
      |                          |                                                      |                           |                           |
      |                          |                               9. Persist score_events entry (audit log)          |                           |
      |                          |                                                      |                           |                           |
      |                          |                               10. If Top 10 changed,                             |                           |
      |                          |                                update cache / sorted set ----------------------->|                           |
      |                          |                                                      |                           |                           |
      |                          |                                                      |                           |                           |
      |                          |                                11. Notify WebSocket layer of scoreboard change ----------------------------->|
      |                          |                                                      |                           |                           |
      |                          |                                                      |                           |   12. Broadcast scoreboard_update
      |                          |                                                      |                           |    to all connected clients
      |                          |                                                      |                           |                           |
      |<------------------------- 13. Browser receives updated scoreboard via WebSocket --------------------------------------------------------+
      |                          |                                                      |                           |                           |
      |                          |<------------------- 15. 200 OK (newScore, delta) ----|                           |                           |
                                
```

---

### 9. Security & Anti‑Abuse Considerations

- **No Direct Client Control of Score**
  - The client never sends the new score or the increment amount.
  - Only a trusted backend with proper authentication is allowed to invoke `/scores/increment`.

- **Idempotency**
  - `actionId` is treated as **unique**:
    - On first use: apply increment and store in `score_events`.
    - On repeated use with same `actionId`: do **not** apply increment again; return a response that indicates `applied: false`.
  - This prevents double‑counting from retries or malicious replay.

- **Authentication & Authorization**
  - Use signed tokens or secure service credentials; validate on every write request.
  - Optionally validate that the `userId` is consistent with the caller’s permitted users (e.g., user in JWT).

- **Rate Limiting / Throttling**
  - Apply per‑caller and/or per‑user **rate limits** to `/scores/increment` (e.g. max X actions per minute).
  - Excessive requests should return `429 Too Many Requests`.

- **Data Validation**
  - Ensure `userId` is a valid and active user.
  - Reject malformed or missing `actionId`.

- **Logging & Monitoring**
  - Log all score updates with:
    - `userId`, `delta`, `reason`, `actionId`, caller identity, and timestamp.
  - Monitor:
    - Suspicious patterns (e.g., sharp spikes in score updates from a single client).
    - Error and rate-limit events.

---

### 10. Error Handling & Response Semantics

- **Consistent Error Shape** (example):
  ```json
  {
    "error": {
      "code": "RATE_LIMITED",
      "message": "Too many score update requests.",
      "details": {}
    }
  }
  ```
  - Use predictable `code` values such as:
    - `UNAUTHENTICATED`
    - `UNAUTHORIZED`
    - `INVALID_REQUEST`
    - `CONFLICT`
    - `RATE_LIMITED`
    - `INTERNAL_ERROR`

- For idempotent retries:
  - Returning `200 OK` with `applied: false` is acceptable.
  - Alternatively, `409 CONFLICT` with a clear error code if clients must be aware of duplicate actions.

---

### 11. Implementation Notes & Suggestions

- **Tech‑agnostic**: The above design is independent of framework/language. For an existing Node.js/Express, NestJS, or similar backend:
  - Implement a `ScoreService` class/module encapsulating:
    - `incrementScore(userId, actionId, reason): { newScore, delta, applied }`
    - `getTopScores(limit): ScoreEntry[]`
  - Use DB transactions or atomic DB operations (e.g., `UPDATE ... SET score = score + :delta WHERE user_id = :userId`) to avoid race conditions.

- **Real‑time Layer**:
  - If the platform already has a WebSocket gateway, integrate scoreboard updates as an additional channel.
  - If not, consider using:
    - A light WebSocket server co‑located with the API, or
    - A managed Pub/Sub + WebSocket combo (e.g., Redis Pub/Sub, Kafka behind a gateway).

- **Caching Strategy**:
  - Maintain a sorted set of user scores in an in‑memory store (e.g. Redis).
  - On each DB update, update Redis and re-compute Top 10 from Redis rather than hitting DB.
  - Periodically reconcile Redis with the DB to prevent drift.

- **Testing Strategy**:
  - Unit tests for:
    - Correct score increments and idempotency by `actionId`.
    - Top 10 computation correctness, especially edge cases with ties.
  - Integration tests for:
    - Auth and authorization enforcement.
    - Rate limiting behaviour.
    - WebSocket broadcasts upon score changes.

---

### 12. Additional Comments & Possible Improvements

- **Multiple Leaderboards**
  - Future extension: support multiple concurrent leaderboards (e.g., per game mode, per region, daily/weekly boards).
  - This would require:
    - Partitioning the score data (additional key or column like `board_id`).
    - Extending APIs to accept a `boardId` parameter.

- **Time‑boxed Leaderboards**
  - Consider supporting leaderboards that reset at a fixed interval (daily, weekly, season-based).
  - Implementation could use:
    - Separate tables/partitions per period, or
    - A `period` column in `user_scores` and `score_events`.

- **Cheating Detection**
  - Add heuristic checks:
    - Max allowable score growth per unit time.
    - Outlier detection (e.g., z-score based on population).
  - Flag suspicious users for manual review rather than blocking in real time.

- **Privacy Considerations**
  - Decide whether to show full user identities or anonymized display names/avatars on the public scoreboard.
  - Enforce any legal or compliance requirements (e.g., GDPR considerations for user deletion).

- **Operational Concerns**
  - Implement feature flags to:
    - Turn off live updates if the real‑time channel becomes unstable.
    - Fallback to polling (`GET /scoreboard/top`) on the client side.

