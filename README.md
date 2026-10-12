# Costwise

**Every expense has a reason.**

Most budgeting apps ask *"how much did you spend?"*. Costwise asks *"what did you spend it on, and was it worth it?"*. Every expense belongs to a **task** (the goal behind the spending), so you can see budget against actual for each thing you're working toward.

> Example: *Renovate the kitchen*, $5,000 budget → paint $320 + tiles $1,800 + contractor $2,500 = **92% used**.

## Features

- **Tasks with budgets**: title, budget, due date, and status (To do / In progress / Done)
- **Expenses linked to tasks**: amount, category, date
- **Budget tracking**: progress bars turn amber at 80% and red when over budget
- **Dashboard**: total budget, spent, remaining, and the number of tasks over budget
- **Spending by category** across all tasks
- Inline budget editing, status filters, and a responsive layout
- Data is saved in `localStorage`, and demo data loads on first visit (use "Reset demo data" to restore it)

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4. No backend and no extra UI dependencies.

State lives in a small external store (`src/lib/store.ts`) backed by `localStorage`, read with `useSyncExternalStore` so server and client renders stay consistent.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Ideas for next steps

- Supabase auth + database for multi-device sync
- Charts over time (monthly spend per task)
- CSV export
- Multi-currency
