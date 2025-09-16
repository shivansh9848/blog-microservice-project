# Blog Microservices

A compact microservices-based blogging platform: Next.js frontend + Node/Express (TypeScript) services — user, author, blog. Backed by MongoDB, PostgreSQL, Redis, RabbitMQ, Cloudinary, Google OAuth, Gemini AI.

## Highlights

- Google OAuth + JWT auth (user service)
- Create/edit blogs, image uploads (Cloudinary), optional AI assist (Gemini) (author service)
- Public reads/search, saved lists, Redis caching + RabbitMQ invalidation (blog service)
- Monorepo: one Next.js app, three services

## Structure

```
frontend/           # Next.js app
services/
	user/            # Auth & profiles (MongoDB)
	author/          # Write/edit blogs (PostgreSQL, RabbitMQ producer)
	blog/            # Public reads/search (PostgreSQL, Redis, RabbitMQ consumer)
```

## Quickstart

1) Create .env files per service with required secrets (see below). Set frontend API base as needed.
2) Install & run:

Frontend

```
cd frontend
npm install
npm run dev
```

Each service

```
cd services/user   && npm install && npm run dev
cd services/author && npm install && npm run dev
cd services/blog   && npm install && npm run dev
```

## Minimum env vars (per service)

- Mongo/Postgres URLs (as applicable)
- REDIS_URL, RABBITMQ_URL
- CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- JWT_SECRET
- GEMINI_API_KEY (author service)
