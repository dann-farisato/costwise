"use client";

import { useSyncExternalStore } from "react";

export type Status = "todo" | "doing" | "done";

export const CATEGORIES = [
  "Materials",
  "Services",
  "Travel",
  "Food",
  "Software",
  "Education",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Task = {
  id: string;
  title: string;
  budget: number;
  status: Status;
  dueDate?: string;
  createdAt: string;
};

export type Expense = {
  id: string;
  taskId: string;
  description: string;
  amount: number;
  category: Category;
  date: string;
};

type Data = { tasks: Task[]; expenses: Expense[] };

const KEY = "costwise:v1";

const uid = () => crypto.randomUUID();
const daysFromNow = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

function seed(): Data {
  const t = (title: string, budget: number, status: Status, due: number): Task => ({
    id: uid(),
    title,
    budget,
    status,
    dueDate: daysFromNow(due),
    createdAt: new Date().toISOString(),
  });
  const kitchen = t("Renovate the kitchen", 5000, "doing", 20);
  const trip = t("Beach trip with friends", 1800, "todo", 45);
  const course = t("English course", 1200, "doing", 90);
  const laptop = t("Upgrade work setup", 3000, "done", -10);

  const e = (task: Task, description: string, amount: number, category: Category, d: number): Expense => ({
    id: uid(),
    taskId: task.id,
    description,
    amount,
    category,
    date: daysFromNow(d),
  });

  return {
    tasks: [kitchen, trip, course, laptop],
    expenses: [
      e(kitchen, "Paint & brushes", 320, "Materials", -12),
      e(kitchen, "Ceramic tiles", 1800, "Materials", -9),
      e(kitchen, "Contractor (first half)", 2500, "Services", -4),
      e(trip, "Bus tickets", 260, "Travel", -2),
      e(course, "Monthly fee", 300, "Education", -30),
      e(course, "Monthly fee", 300, "Education", -1),
      e(course, "Textbook", 140, "Education", -28),
      e(laptop, "External monitor", 1450, "Materials", -20),
      e(laptop, "Mechanical keyboard", 620, "Materials", -18),
      e(laptop, "Note-taking app (yearly)", 180, "Software", -15),
      e(laptop, "Ergonomic chair", 1100, "Materials", -14),
    ],
  };
}

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Data;
  } catch {}
  return seed();
}

// Tiny external store backed by localStorage. The server snapshot is null,
// so the first client render matches the static HTML and then fills in.
let cache: Data | null = null;
const listeners = new Set<() => void>();

const getSnapshot = () => (cache ??= load());
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

function update(fn: (d: Data) => Data) {
  cache = fn(getSnapshot());
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {}
  listeners.forEach((l) => l());
}

const actions = {
  addTask: (input: Omit<Task, "id" | "createdAt">) => {
    const task: Task = { ...input, id: uid(), createdAt: new Date().toISOString() };
    update((d) => ({ ...d, tasks: [task, ...d.tasks] }));
    return task;
  },
  updateTask: (id: string, patch: Partial<Task>) =>
    update((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  deleteTask: (id: string) =>
    update((d) => ({
      tasks: d.tasks.filter((t) => t.id !== id),
      expenses: d.expenses.filter((e) => e.taskId !== id),
    })),
  addExpense: (input: Omit<Expense, "id">) =>
    update((d) => ({ ...d, expenses: [{ ...input, id: uid() }, ...d.expenses] })),
  deleteExpense: (id: string) =>
    update((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) })),
  resetDemo: () => update(() => seed()),
};

export function useStore() {
  const data = useSyncExternalStore(subscribe, getSnapshot, () => null);
  return {
    ready: data !== null,
    tasks: data?.tasks ?? [],
    expenses: data?.expenses ?? [],
    ...actions,
  };
}

export type Store = ReturnType<typeof useStore>;

export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export const spentFor = (taskId: string, expenses: Expense[]) =>
  expenses.filter((e) => e.taskId === taskId).reduce((s, e) => s + e.amount, 0);
