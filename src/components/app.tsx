"use client";

import { useMemo, useState } from "react";
import {
  CATEGORIES,
  type Category,
  type Expense,
  type Status,
  type Store,
  type Task,
  money,
  spentFor,
  useStore,
} from "@/lib/store";

const STATUS_LABEL: Record<Status, string> = { todo: "To do", doing: "In progress", done: "Done" };
const STATUS_STYLE: Record<Status, string> = {
  todo: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  doing: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

const card = "rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";
const input =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-500";
const btn =
  "rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200";

function usage(spent: number, budget: number) {
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  const tone = pct > 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
  const text = pct > 100 ? "text-red-600 dark:text-red-400" : pct >= 80 ? "text-amber-600 dark:text-amber-400" : "text-zinc-500";
  return { pct, tone, text };
}

function Progress({ spent, budget }: { spent: number; budget: number }) {
  const { pct, tone } = usage(spent, budget);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function App() {
  const store = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");

  const { tasks, expenses } = store;
  const selected = tasks.find((t) => t.id === selectedId) ?? tasks[0];

  const totals = useMemo(() => {
    const budget = tasks.reduce((s, t) => s + t.budget, 0);
    const spent = expenses.reduce((s, e) => s + e.amount, 0);
    const over = tasks.filter((t) => spentFor(t.id, expenses) > t.budget).length;
    return { budget, spent, over };
  }, [tasks, expenses]);

  if (!store.ready) return <div className="flex-1" />;

  const visible = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div className="flex-1 bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Cost<span className="text-emerald-500">wise</span>
            </h1>
            <p className="text-sm text-zinc-500">Every expense has a reason. Track what you spend on what matters.</p>
          </div>
          <button
            onClick={() => confirm("Reset everything to the demo data?") && store.resetDemo()}
            className="text-sm text-zinc-500 underline-offset-4 hover:underline"
          >
            Reset demo data
          </button>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Total budget" value={money(totals.budget)} />
          <Stat label="Spent" value={money(totals.spent)} />
          <Stat
            label="Remaining"
            value={money(totals.budget - totals.spent)}
            accent={totals.budget - totals.spent < 0 ? "text-red-500" : undefined}
          />
          <Stat
            label="Over budget"
            value={`${totals.over} task${totals.over === 1 ? "" : "s"}`}
            accent={totals.over ? "text-red-500" : "text-emerald-500"}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <aside className="space-y-4">
            <NewTaskForm onCreate={(t) => setSelectedId(store.addTask(t).id)} />

            <div className="flex gap-1 rounded-lg bg-zinc-200/60 p-1 text-sm dark:bg-zinc-800/60">
              {(["all", "todo", "doing", "done"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 whitespace-nowrap rounded-md px-1 py-1 text-xs sm:text-sm ${
                    filter === f ? "bg-white shadow-sm dark:bg-zinc-700" : "text-zinc-500"
                  }`}
                >
                  {f === "all" ? "All" : STATUS_LABEL[f]}
                </button>
              ))}
            </div>

            <ul className="space-y-2">
              {visible.length === 0 && <li className="py-8 text-center text-sm text-zinc-500">No tasks here yet.</li>}
              {visible.map((t) => {
                const spent = spentFor(t.id, expenses);
                const { pct, text } = usage(spent, t.budget);
                const active = selected?.id === t.id;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => {
                        setSelectedId(t.id);
                        // On narrow screens the detail panel sits below the list.
                        if (window.innerWidth < 1024)
                          document.getElementById("detail")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        active
                          ? "border-zinc-900 bg-white dark:border-zinc-300 dark:bg-zinc-900"
                          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <span className="font-medium">{t.title}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[t.status]}`}>
                          {STATUS_LABEL[t.status]}
                        </span>
                      </div>
                      <Progress spent={spent} budget={t.budget} />
                      <div className="mt-2 flex justify-between text-xs">
                        <span className="text-zinc-500">
                          {money(spent)} of {money(t.budget)}
                        </span>
                        <span className={text}>{Math.round(pct)}%</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <main id="detail" className="min-w-0 scroll-mt-4 space-y-6">
            {selected ? (
              <TaskDetail key={selected.id} task={selected} store={store} />
            ) : (
              <div className={`${card} py-16 text-center text-zinc-500`}>Create your first task to start tracking.</div>
            )}
            <CategoryBreakdown expenses={expenses} />
          </main>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className={card}>
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

function NewTaskForm({ onCreate }: { onCreate: (t: Omit<Task, "id" | "createdAt">) => void }) {
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [dueDate, setDueDate] = useState("");

  return (
    <form
      className={`${card} space-y-3`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onCreate({ title: title.trim(), budget: Number(budget) || 0, status: "todo", dueDate: dueDate || undefined });
        setTitle("");
        setBudget("");
        setDueDate("");
      }}
    >
      <div className="text-sm font-medium">New task</div>
      <input className={input} placeholder="What's the goal? e.g. Paint the bedroom" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="flex gap-2">
        <input className={input} type="number" min="0" placeholder="Budget ($)" value={budget} onChange={(e) => setBudget(e.target.value)} />
        <input className={input} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Due date" />
      </div>
      <button className={`${btn} w-full`} disabled={!title.trim()}>
        Add task
      </button>
    </form>
  );
}

function TaskDetail({ task, store }: { task: Task; store: Store }) {
  const items = store.expenses.filter((e) => e.taskId === task.id).sort((a, b) => b.date.localeCompare(a.date));
  const spent = items.reduce((s, e) => s + e.amount, 0);
  const left = task.budget - spent;
  const { pct, text } = usage(spent, task.budget);

  return (
    <section className={`${card} space-y-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">{task.title}</h2>
          {task.dueDate && (
            <p className="text-sm text-zinc-500">
              Due {new Date(task.dueDate + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            className={`${input} w-auto`}
            value={task.status}
            onChange={(e) => store.updateTask(task.id, { status: e.target.value as Status })}
            aria-label="Status"
          >
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button
            onClick={() => confirm(`Delete "${task.title}" and its expenses?`) && store.deleteTask(task.id)}
            className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            Delete
          </button>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span>
            <span className="text-lg font-semibold tabular-nums">{money(spent)}</span>
            <span className="text-zinc-500"> spent of </span>
            <BudgetEditor value={task.budget} onChange={(budget) => store.updateTask(task.id, { budget })} />
          </span>
          <span className={`tabular-nums ${text}`}>
            {left >= 0 ? `${money(left)} left` : `${money(-left)} over budget`} · {Math.round(pct)}%
          </span>
        </div>
        <Progress spent={spent} budget={task.budget} />
      </div>

      <NewExpenseForm onAdd={(e) => store.addExpense({ ...e, taskId: task.id })} />

      <div>
        <h3 className="mb-2 text-sm font-medium text-zinc-500">Expenses ({items.length})</h3>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">No expenses yet. What did this task cost you?</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((e) => (
              <li key={e.id} className="group flex items-center gap-3 py-2.5 text-sm">
                <span className="w-16 shrink-0 text-xs text-zinc-500">
                  {new Date(e.date + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <span className="min-w-0 flex-1 truncate">{e.description}</span>
                <span className="hidden rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 sm:inline dark:bg-zinc-800 dark:text-zinc-300">
                  {e.category}
                </span>
                <span className="w-20 text-right font-medium tabular-nums">{money(e.amount)}</span>
                <button
                  onClick={() => store.deleteExpense(e.id)}
                  className="text-zinc-400 opacity-0 hover:text-red-500 group-hover:opacity-100 focus:opacity-100"
                  aria-label={`Delete ${e.description}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function BudgetEditor({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (!editing)
    return (
      <button
        className="font-medium tabular-nums underline decoration-dotted underline-offset-4"
        onClick={() => {
          setDraft(String(value));
          setEditing(true);
        }}
        title="Edit budget"
      >
        {money(value)}
      </button>
    );

  const commit = () => {
    onChange(Math.max(0, Number(draft) || 0));
    setEditing(false);
  };
  return (
    <input
      autoFocus
      type="number"
      min="0"
      className="w-24 rounded border border-zinc-300 bg-transparent px-1 text-sm dark:border-zinc-600"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
    />
  );
}

function NewExpenseForm({ onAdd }: { onAdd: (e: Omit<Expense, "id" | "taskId">) => void }) {
  const today = new Date().toLocaleDateString("en-CA"); // local YYYY-MM-DD
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Materials");
  const [date, setDate] = useState(today);
  const valid = description.trim() && Number(amount) > 0;

  return (
    <form
      className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-50 p-3 sm:grid-cols-[1fr_1fr_1fr_auto] dark:bg-zinc-950"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onAdd({ description: description.trim(), amount: Number(amount), category, date });
        setDescription("");
        setAmount("");
      }}
    >
      <input className={`${input} col-span-full`} placeholder="What did you pay for?" value={description} onChange={(e) => setDescription(e.target.value)} />
      <input className={input} type="number" min="0" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <select className={input} value={category} onChange={(e) => setCategory(e.target.value as Category)} aria-label="Category">
        {CATEGORIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <input className={input} type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
      <button className={btn} disabled={!valid}>
        Add
      </button>
    </form>
  );
}

function CategoryBreakdown({ expenses }: { expenses: Expense[] }) {
  const rows = CATEGORIES.map((c) => ({
    category: c,
    total: expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0),
  }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
  const max = rows[0]?.total ?? 0;
  const sum = rows.reduce((s, r) => s + r.total, 0);

  return (
    <section className={card}>
      <h3 className="mb-4 text-sm font-medium text-zinc-500">Spending by category · all tasks</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">Nothing spent yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.category} className="grid grid-cols-[90px_1fr_auto] items-center gap-3 text-sm">
              <span>{r.category}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-full rounded-full bg-zinc-800 dark:bg-zinc-300" style={{ width: `${(r.total / max) * 100}%` }} />
              </div>
              <span className="w-28 text-right tabular-nums">
                {money(r.total)} <span className="text-xs text-zinc-500">({Math.round((r.total / sum) * 100)}%)</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
