# MyBookList

A clean, responsive book-tracking web app (MyAnimeList-style, but for books). Built with Next.js, Tailwind CSS, and **Supabase** for authentication and cloud storage.

## Features

- **Email auth** — Sign up, log in, and sign out with per-user data isolation
- **Book Search** — Google Books API integration with autocomplete suggestions
- **Manual Entry** — Add books by title, author, and cover URL when search fails
- **Reading Statuses** — Reading, Completed, On Hold, DNF, Plan to Read
- **Decimal Ratings** — 0.0 to 5.0 scale with one decimal place
- **Sort by Score** — Toggle to sort your list highest to lowest
- **Profile** — Username, avatar, bio, and yearly/monthly reading goals (saved to Supabase)
- **Metrics Dashboard** — Total read, average rating, goal progress
- **Completion History** — Timeline of when books were finished
- **Personalized recommendations** — Daily picks on the Add page

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Supabase Auth + Postgres (RLS)

## Getting Started

### 1. Supabase setup (required)

1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** and run the contents of `supabase/schema.sql`
3. Copy `.env.local.example` → `.env.local` and add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (from **Project Settings → API**)

### 2. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You’ll be redirected to **Log In** until you authenticate.

### Google Books Search (optional)

Add a free API key to `.env.local` for reliable search and metadata backfill:

```
GOOGLE_BOOKS_API_KEY=your_key_here
```

Restart `npm run dev` after changing env variables.

## Project Structure

```
src/
├── app/
│   ├── login/            # Auth UI
│   ├── api/books/        # Google Books proxy
│   ├── add/
│   └── profile/
├── components/
├── lib/storage/          # Supabase DB layer + mappers
├── lib/supabase/         # Browser/server clients + middleware
└── providers/            # Auth + book state
supabase/
├── migrations/           # Versioned schema
└── schema.sql            # One-shot SQL for SQL editor
```

## Security

- Row Level Security (RLS) on `profiles` and `user_books`
- Each user can only read/write their own `user_id` rows
- Session cookies refreshed via Next.js middleware
