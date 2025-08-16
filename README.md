# Blog Microservices Project (2025)

A production-style microservices monorepo for a blogging platform. It includes a modern Next.js frontend and three backend services split by domain:

- **user service**: Authentication (Google OAuth), user profiles, and JWT issuance backed by MongoDB + Cloudinary
- **author service**: Authoring workflows (create/update/delete blogs), AI assist (Gemini), image upload, and cache invalidation producer backed by PostgreSQL + RabbitMQ
- **blog service**: Public blog reading, search/filter, comments, saved blogs, Redis caching, and cache invalidation consumer backed by PostgreSQL + Redis

This README explains the structure, technologies, data flow, and how to run everything locally for interview prep and hands-on learning.

---

## Repository structure

- `frontend/` — Next.js 15 (App Router), Tailwind CSS 4, Radix UI, Jodit editor, Axios
- `services/`
  - `user/` — Express 5 + TypeScript; MongoDB (users), Google OAuth, Cloudinary uploads, JWT
  - `author/` — Express 5 + TypeScript; PostgreSQL (blogs/comments/saved), Cloudinary, RabbitMQ (producer), Gemini AI
  - `blog/` — Express 5 + TypeScript; PostgreSQL (reads), Redis cache, RabbitMQ (consumer), service-to-service calls
- `blog.pem` — (example key placeholder in repo root if needed for deployments)

---

## High-level architecture

```
[ Next.js Frontend ]  --Axios-->  [ user svc ] --MongoDB
         |                            |\
         |                            |  issues JWT (HS256)
         |                            v
         |  --Axios(Bearer JWT)--> [ author svc ] -- Postgres (Neon/local)
         |                               |  \
         |                               |   \-- uploads -> Cloudinary
         |                               |   \-- AI assist -> Gemini API
         |                               |
         |                               +--> publishes cache invalidation to RabbitMQ
         |
         +--Axios-->  [ blog svc ] -- Postgres (Neon/local)
                              |\
                              |  reads from Redis cache (Upstash/local)
                              +-- consumes invalidation messages from RabbitMQ
```

---

## Domain responsibilities

- **user service**
  - Google OAuth login (authorization code flow via googleapis)
  - Creates/finds users in MongoDB; issues JWT (signed with JWT_SEC)
  - Profile read/update; profile image upload via Cloudinary
- **author service**
  - Create/update/delete blogs (with image upload to Cloudinary)
  - Initializes Postgres tables (blogs, comments, savedblogs)
  - AI helpers (title, description, content grammar fix) via Gemini
  - Publishes cache invalidation messages to RabbitMQ after mutations
- **blog service**
  - Public blog listing with search and category filter (ILIKE queries)
  - Single blog fetch, comments CRUD (add/delete), save/unsave blog
  - Aggressive Redis caching for list and single blog; auto rebuilds list cache on invalidation events
  - Calls user service to enrich blog author data when reading a single blog

---

## Key technologies and why

- **Next.js 15 + React 19**: App Router, server components, great DX for modern SPA/SSR/SSG
- **Tailwind CSS 4 + Radix UI**: rapid, accessible UI building blocks
- **Jodit Editor**: rich text editor for authoring blog HTML
- **Express 5 + TypeScript**: fast HTTP services with types
- **Data stores:**
  - MongoDB: user identities and profiles (flexible user schema)
  - PostgreSQL (Neon/serverless or local): blogs, comments, savedblogs (relational queries, search)
  - Redis (Upstash or local): read caching (dramatically reduces DB load and latency)
- **Messaging**: RabbitMQ for cache invalidation fanout (author -> blog)
- **Media**: Cloudinary for image storage and delivery
- **Identity**: Google OAuth (googleapis), JWT for service authorization
- **AI**: Google Gemini models for writing assist

---

## Environment variables

Create and populate each service’s `.env` from the examples below:

- **frontend/.env.local**
  - NEXT_PUBLIC_USER_SERVICE=http://localhost:5000
  - NEXT_PUBLIC_AUTHOR_SERVICE=http://localhost:5001
  - NEXT_PUBLIC_BLOG_SERVICE=http://localhost:5002

- **services/user/.env**
  - PORT=5000
  - MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<db>?retryWrites=true&w=majority
  - JWT_SEC=your_jwt_secret
  - Cloud_Name=your_cloudinary_cloud
  - Cloud_Api_Key=your_cloudinary_key
  - Cloud_Api_Secret=your_cloudinary_secret
  - Google_Client_id=your_google_oauth_client_id
  - Google_client_secret=your_google_oauth_client_secret

- **services/author/.env**
  - PORT=5001
  - DB_URL=postgresql://<user>:<pass>@<host>/<db>?sslmode=require
  - JWT_SEC=your_jwt_secret
  - Cloud_Name=your_cloudinary_cloud
  - Cloud_Api_Key=your_cloudinary_key
  - Cloud_Api_Secret=your_cloudinary_secret
  - Rabbimq_Host=localhost
  - Rabbimq_Username=admin
  - Rabbimq_Password=admin123
  - Gemini_Api_Key=your_gemini_api_key

- **services/blog/.env**
  - PORT=5002
  - DB_URL=postgresql://<user>:<pass>@<host>/<db>?sslmode=require
  - JWT_SEC=your_jwt_secret
  - REDIS_URL=redis://localhost:6379  (or rediss:// Upstash URL)
  - Rabbimq_Host=localhost
  - Rabbimq_Username=admin
  - Rabbimq_Password=admin123
  - USER_SERVICE=http://localhost:5000

**Notes**
- Keep the same JWT_SEC across services so tokens verify consistently.
- blog service needs USER_SERVICE to resolve blog author profile data.
- For Upstash Redis, use the rediss:// URL directly in REDIS_URL.

---

## Running locally (Windows-friendly)

**Prerequisites**
- Node.js 20+ and npm
- MongoDB (Atlas URI is easiest) for user service
- PostgreSQL (local) or a Neon serverless database for author/blog services
- Redis (local) or an Upstash Redis database for blog caching
- RabbitMQ (local Docker is easiest)
- Cloudinary account (for image uploads)
- Google OAuth client (Web) and Gemini API key (optional but recommended)

**Start core dependencies (options)**
- Redis: install locally or use Upstash (no local process needed)
- RabbitMQ: easiest is Docker Desktop on Windows
  - Pull and run with management UI on http://localhost:15672
    - user: admin, pass: admin123 (match your .env)
  - Example command is included below in this README under “Docker snippets”.

**Install and run services**
1. user service (port 5000)
    ```sh
    cd services/user
    npm install
    npm run build
    npm start   # or npm run dev
    ```
2. author service (port 5001)
    ```sh
    cd services/author
    npm install
    npm run build
    npm start   # or npm run dev
    ```
3. blog service (port 5002)
    ```sh
    cd services/blog
    npm install
    npm run build
    npm start   # or npm run dev
    ```
4. frontend (Next.js)
    ```sh
    cd frontend
    npm install
    npm run dev
    # Open http://localhost:3000
    ```

---

## API overview (selected)

**Base paths**
- user: http://localhost:5000/api/v1
- author: http://localhost:5001/api/v1
- blog: http://localhost:5002/api/v1

**user service**
- POST /login — body: { code } (Google authorization code) → { token, user }
- GET /me — Bearer JWT → current user
- GET /user/:id — public user profile by id
- POST /user/update — Bearer JWT, profile updates
- POST /user/update/pic — Bearer JWT, multipart/form-data image file

**author service**
- POST /blog/new — Bearer JWT, multipart/form-data { title, description, blogcontent, category, image }
- POST /blog/:id — Bearer JWT, multipart/form-data update
- DELETE /blog/:id — Bearer JWT
- POST /ai/title — { text }
- POST /ai/descripiton — { title, description }
- POST /ai/blog — { blog } (HTML string) → { html } corrected

**blog service**
- GET /blog/all?searchQuery=&category= — list with search + filter (Redis-cached)
- GET /blog/:id — single blog + author (Redis-cached)
- POST /comment/:id — Bearer JWT, add comment to blog id
- GET /comment/:id — list comments for blog id
- DELETE /comment/:commentid — Bearer JWT, delete own comment
- POST /save/:blogid — Bearer JWT, toggle save/unsave
- GET /blog/saved/all — Bearer JWT, list saved blogs for current user

**Auth header**
- Authorization: Bearer <JWT from user service /login>

---

## Data and caching details

**PostgreSQL schema (created by author service on boot)**
- blogs(id, title, description, blogcontent, image, category, author, create_at)
- comments(id, comment, userid, username, blogid, create_at)
- savedblogs(id, userid, blogid, create_at)

**Caching strategy (blog service)**
- Keys
  - List: blogs:<searchQuery>:<category> (EX 3600 seconds)
  - Single: blog:<blogId> (EX 3600 seconds)
- Invalidation
  - author service publishes { action: "invalidateCache", keys: ["blogs:*"] } via RabbitMQ
  - blog service consumes, deletes matching keys, and pre-warms the default list cache
- Redis client resilience
  - Exponential reconnect and periodic ping keepalive to avoid idle disconnects

---

## Frontend highlights

- Next.js App Router, React 19, Tailwind CSS 4
- Radix UI primitives and custom UI components
- Jodit React for rich HTML authoring
- Global context (src/context/AppContext.tsx)
  - Stores user session (cookie token), blog list/filter state, and saved blogs
  - Service base URLs are read from NEXT_PUBLIC_* envs

---

## Docker snippets (optional)

**Build services**
- docker build -t user-svc:local ./services/user
- docker build -t author-svc:local ./services/author
- docker build -t blog-svc:local ./services/blog

**Run RabbitMQ (with management)**
- docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS=admin123 rabbitmq:3-management

**Notes**
- The user and author Dockerfiles already include a minimal two-stage build. The blog Dockerfile’s runtime stage is commented — uncomment or mirror the pattern from user/author when containerizing.
- Provide environment variables to containers via --env or --env-file per service.

---

## Troubleshooting

- 401 Please Login — Missing or invalid Authorization header (Bearer token). Make sure the same JWT_SEC is used across services and that the token hasn’t expired.
- Redis errors — If using Upstash, ensure REDIS_URL uses rediss:// and that outbound internet is allowed. For local Redis, confirm the service listens on 6379 and matches REDIS_URL.
- Postgres connection — Verify DB_URL and that sslmode matches your provider (Neon usually requires sslmode=require).
- Cloudinary upload errors — Ensure Cloud_Name/Api_Key/Api_Secret match your account and that the incoming file is properly handled (multer + data URI conversion).
- Google OAuth — For local dev, use the “postmessage” redirect as configured in the user service. The frontend obtains an authorization code from Google and exchanges it on the backend.
- RabbitMQ — If the blog cache isn’t being invalidated after author service mutations, confirm both producer and consumer can reach the broker (host, port, creds).

---

## What to emphasize in interviews

- Clear separation of concerns across microservices; least privilege data stores per domain
- Read-heavy path optimized with Redis cache and async invalidation via RabbitMQ
- Resilient Redis client with reconnect/ping and proactive cache pre-warming
- Hybrid data model: MongoDB for flexible user identities; Postgres for relational blog data
- Secure media handling via Cloudinary; signed JWT for inter-service auth
- Modern frontend stack (Next.js 15, React 19, Tailwind 4, Radix UI) and rich HTML editor integration
- Room to extend: rate limiting, observability (metrics/logs/traces), API gateway, CI/CD, infra as code

---

## License
For learning and interview preparation. Replace credentials and secrets with your own values before deploying.
