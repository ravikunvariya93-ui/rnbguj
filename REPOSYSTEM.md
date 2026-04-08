# Repository Overview: rnbguj (Infrastructure Management)

This document provides a high-level map of the repository to help AI agents find relevant code quickly without searching the whole codebase.

## Core Directories
- `/app`: Next.js 15 app router (pages and API routes).
- `/components`: UI components, forms, and common elements (e.g., `TenderForm.tsx`, `Sidebar.tsx`).
- `/lib`: Database connection, shared utilities, and authentication configurations (`auth.ts`).
- `/models`: Mongoose database schemas for Tenders, Approvals, LOAs, etc.
- `/public`: Static assets (images, icons).

## Key Files & Logic
- `auth.ts`: Configuration for Auth.js (NextAuth v5).
- `models/`: Central location for all data structures.
- `lib/db.ts`: Mongoose connection handler.
- `components/`: Contains large monolithic forms (being modularized).

## Architecture
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Database**: MongoDB with Mongoose
- **Auth**: Auth.js with Role-Based Access Control (RBAC)

## Token Efficiency Note
When editing forms, check if they have sub-components in `components/forms/`. Use these sub-components instead of editing the main monolithic file.
