# YT Clone Backend

A Node.js/Express backend for the YT Clone application with Supabase integration.

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration (Supabase)
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_change_this_in_production
JWT_EXPIRES_IN=7d
```

### 2. Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy the URL and API keys to your `.env` file
3. Create the users table in your Supabase database using the SQL provided below

### 3. Database Schema

Run this SQL in your Supabase SQL editor:

```sql
-- USERS table
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- POSTS (public feed)
CREATE TABLE IF NOT EXISTS public.posts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  content TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- COMMENTS
CREATE TABLE IF NOT EXISTS public.comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- LIKES
CREATE TABLE IF NOT EXISTS public.likes (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (post_id, user_id)
);

-- LOGIN LOGS (ip tracking)
CREATE TABLE IF NOT EXISTS public.login_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('login','logout')),
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- updated_at trigger for posts
DROP TRIGGER IF EXISTS posts_set_updated_at ON public.posts;
CREATE TRIGGER posts_set_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Refresh PostgREST schema cache after DDL
SELECT pg_notify('pgrst', 'reload schema');
```

### 4. Installation and Running

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production mode
npm start
```

## API Endpoints

### Authentication Routes (`/api/auth`)

- `POST /signup` - Register a new user
- `POST /login` - Authenticate user
- `GET /me` - Get current user (requires authentication)

### Health Check

- `GET /health` - Service health check

## Security Features

- Helmet for security headers
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Password hashing with bcrypt
- JWT authentication
- Input validation

## Development Notes

- The server will use default JWT secrets for development if not configured
- All validation errors and security issues have been addressed
- Database connection uses Supabase client for consistency
- Environment variables are validated on startup
