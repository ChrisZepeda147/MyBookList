# 📚 MyBookList

> A clean, full-stack book-tracking application built with **Next.js 16**, **React 19**, **Tailwind CSS 4**, and **Supabase**. Features Google Books API integration, granular reading analytics, and per-user data isolation via Row Level Security (RLS).

## 👤 Developer & Architecture

* **Author:** **Chris Zepeda** ([@ChrisZepeda147](https://github.com/ChrisZepeda147))
* **Project Type:** Solo Hero Application

-## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework & UI** | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| **Database & Auth** | Supabase PostgreSQL, Row Level Security (RLS), Supabase Auth |
| **Integrations** | Google Books API |
| **State & Security** | Next.js Middleware, React Context Providers |

---

## ✨ Key Features

* **🔐 Secure Auth & Data Isolation:** Email authentication with strict PostgreSQL Row Level Security (RLS) ensuring complete tenant isolation.
* **🔍 Google Books API Integration:** Fast book search with autocomplete suggestions and automatic metadata backfilling.
* **📝 Manual Metadata Fallback:** Capability to add custom books by title, author, and cover URL when titles aren't in public databases.
* **📊 Analytics & Goal Dashboard:** Tracks total books read, average ratings, goal progress, and finished completion timelines.
* **⭐ Decimal Ratings & Sorting:** 0.0 to 5.0 rating scale with one-decimal precision and instant score-based sorting.
* **🎯 Status Tracking:** Categorize titles across *Reading, Completed, On Hold, DNF,* and *Plan to Read*.
* **🤖 Personal Recommendations:** Daily algorithmic recommendations on the discovery feed.

---

## 🔒 Security & Data Integrity

* **Row Level Security (RLS):** Enabled on all core tables (`profiles`, `user_books`).
* **Strict Policy Rules:** Each user can strictly only read, write, or modify rows matching their authenticated `user_id`.
* **Server-Side Session Guards:** Auth tokens and session cookies are refreshed seamlessly via Next.js middleware.

---

## 📂 Project Structure

mybooklist/
├── src/
│   ├── app/
│   │   ├── login/            # Authentication UI & login flows
│   │   ├── api/books/        # Google Books proxy endpoint
│   │   ├── add/              # Book discovery & manual entry
│   │   └── profile/          # User metrics & reading goals
│   ├── components/           # Reusable UI component library
│   ├── lib/
│   │   ├── storage/          # Supabase DB layer & mappers
│   │   └── supabase/         # Browser/Server clients & middleware
│   └── providers/            # React Context (Auth + State management)
└── supabase/
├── migrations/           # Versioned schema migrations
└── schema.sql            # SQL definitions & RLS policy setup

## ⚙️ Local Development Setup

### 1. Supabase & Environment Setup
1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL statements inside `supabase/schema.sql` in your Supabase SQL Editor.
3. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_BOOKS_API_KEY=your_google_books_api_key
