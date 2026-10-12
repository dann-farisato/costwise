"use client";

import { type CSSProperties, useMemo, useState } from "react";
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

type Tone = "ok" | "near" | "over";
const toneOf = (pct: number): Tone => (pct > 100 ? "over" : pct >= 80 ? "near" : "ok");
const pctOf = (spent: number, budget: number) => (budget > 0 ? (spent / budget) * 100 : spent > 0 ? 101 : 0);

// Tone colors on the dark ground.
const TONE_BG: Record<Tone, string> = { ok: "bg-accent", near: "bg-paper", over: "bg-over" };
const TONE_TEXT: Record<Tone, string> = { ok: "text-accent", near: "text-paper", over: "text-over" };

const label = "font-mono text-[11px] uppercase tracking-[0.12em]";
const shortDate = (iso: string, withYear = false) =>
  new Date(iso + "T00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear && { year: "numeric" }),
  });

export default function App() {
  const store = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [creating, setCreating] = useState(false);

  const { tasks, expenses } = store;
  const selected = tasks.find((t) => t.id === selectedId) ?? tasks[0];

  const stats = useMemo(() => {
    const byTask = new Map(tasks.map((t) => [t.id, spentFor(t.id, expenses)]));
    const budget = tasks.reduce((s, t) => s + t.budget, 0);
    const spent = expenses.reduce((s, e) => s + e.amount, 0);
    const over = tasks.filter((t) => (byTask.get(t.id) ?? 0) > t.budget).length;
    return { byTask, budget, spent, over };
  }, [tasks, expenses]);

  if (!store.ready) return <div className="flex-1" />;

  const select = (id: string) => {
    setSelectedId(id);
    // On narrow screens the receipt sits below the list.
    if (window.innerWidth < 1024) document.getElementById("receipt")?.scrollIntoView({ behavior: "smooth" });
  };
  const visible = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);
  const used = stats.budget > 0 ? Math.round((stats.spent / stats.budget) * 100) : 0;

  return (
    <div className="flex-1 bg-ink text-paper">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-10 px-4 pt-7 pb-20 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
            <h1 className="font-display text-[30px] leading-none font-extrabold tracking-[-0.04em]">
              costwise<span className="text-accent">.</span>
            </h1>
            <span className={`${label} text-muted`}>every expense has a reason</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => confirm("Reset everything to the demo data?") && store.resetDemo()}
              className="px-2 py-3 font-mono text-[13px] text-muted hover:text-paper"
            >
              Reset demo
            </button>
            <button
              onClick={() => setCreating((c) => !c)}
              aria-expanded={creating}
              className="flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-ink hover:brightness-95"
            >
              <PlusIcon />
              New task
            </button>
          </div>
        </header>

        {creating && (
          <NewTaskForm
            onCancel={() => setCreating(false)}
            onCreate={(t) => {
              setSelectedId(store.addTask(t).id);
              setFilter("all");
              setCreating(false);
            }}
          />
        )}

        <section className="flex flex-col gap-7">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="flex min-w-0 flex-col gap-3">
              <span className={`${label} tracking-[0.14em] text-muted`}>
                Spent across {tasks.length} task{tasks.length === 1 ? "" : "s"}
              </span>
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 font-display leading-[0.86] font-extrabold tracking-[-0.05em]">
                <span className="text-[clamp(64px,11vw,168px)] tabular-nums">{money(stats.spent)}</span>
                <span className="text-[clamp(28px,4vw,56px)] text-faint tabular-nums">/ {money(stats.budget)}</span>
              </div>
            </div>
            <div className="grid w-full grid-cols-3 overflow-hidden rounded-[18px] border border-line sm:w-auto sm:min-w-[420px]">
              <Stat name="Remaining" value={money(stats.budget - stats.spent)} tone={stats.spent > stats.budget ? "text-over" : ""} />
              <Stat
                name="Over budget"
                value={`${stats.over} task${stats.over === 1 ? "" : "s"}`}
                tone={stats.over ? "text-over" : "text-accent"}
              />
              <Stat name="Used" value={`${used}%`} last />
            </div>
          </div>

          {tasks.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className={`${label} flex justify-between gap-3 text-muted`}>
                <span>Budget ruler · one block per task, sized by its budget</span>
                <span className="hidden sm:inline">$0 → {money(stats.budget)}</span>
              </div>
              <div className="flex h-14 gap-1">
                {tasks.map((t) => {
                  const pct = pctOf(stats.byTask.get(t.id) ?? 0, t.budget);
                  const tone = toneOf(pct);
                  return (
                    <button
                      key={t.id}
                      onClick={() => select(t.id)}
                      aria-label={`Open ${t.title}`}
                      style={{ flex: `${Math.max(t.budget, stats.budget * 0.04)} 1 0` }}
                      className={`relative flex min-w-0 items-center overflow-hidden rounded-lg border-2 bg-[#1d1e17] ${
                        selected?.id === t.id ? "border-paper" : "border-transparent hover:border-line"
                      }`}
                    >
                      <span
                        className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${tone === "over" ? "hatch-over" : TONE_BG[tone]}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                      {/* Light label everywhere, dark copy clipped to the filled part. */}
                      <RulerLabel title={t.title} pct={pct} className="relative text-paper" />
                      <RulerLabel
                        title={t.title}
                        pct={pct}
                        className="absolute inset-0 text-ink transition-[clip-path] duration-500"
                        style={{ clipPath: `inset(0 ${100 - Math.min(pct, 100)}% 0 0)` }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <aside className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-[22px] font-bold tracking-[-0.02em]">Tasks</h2>
              <div className="flex gap-0.5 rounded-full border border-line p-[3px]">
                {(["all", "todo", "doing", "done"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`h-8 rounded-full px-3 font-mono text-xs whitespace-nowrap ${
                      filter === f ? "bg-paper text-ink" : "text-muted hover:text-paper"
                    }`}
                  >
                    {f === "all" ? "All" : STATUS_LABEL[f]}
                  </button>
                ))}
              </div>
            </div>

            {visible.length === 0 && (
              <p className="rounded-2xl border border-dashed border-line py-10 text-center text-sm text-muted">
                No tasks here yet.
              </p>
            )}

            {visible.map((t) => {
              const spent = stats.byTask.get(t.id) ?? 0;
              const pct = pctOf(spent, t.budget);
              const tone = toneOf(pct);
              const count = expenses.filter((e) => e.taskId === t.id).length;
              const active = selected?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => select(t.id)}
                  className={`flex w-full flex-col gap-3 rounded-2xl border px-5 py-[18px] text-left transition-colors ${
                    active ? "border-paper bg-surface" : "border-line hover:border-faint"
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-[17px] leading-snug font-semibold">{t.title}</span>
                    <StatusTag status={t.status} />
                  </span>
                  <span className="flex items-baseline justify-between font-mono text-sm tabular-nums">
                    <span>
                      {money(spent)} <span className="text-muted">/ {money(t.budget)}</span>
                    </span>
                    <span className={`font-semibold ${TONE_TEXT[tone]}`}>{Math.round(pct)}%</span>
                  </span>
                  <span className="relative block h-2 overflow-hidden rounded-xs bg-well">
                    <span
                      className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${TONE_BG[tone]}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                    {[25, 50, 75].map((q) => (
                      <span key={q} className="absolute inset-y-0 w-px bg-ink" style={{ left: `${q}%` }} />
                    ))}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {count} expense{count === 1 ? "" : "s"}
                    {t.dueDate && ` · due ${shortDate(t.dueDate)}`}
                  </span>
                </button>
              );
            })}

            <CategoryBreakdown expenses={expenses} />
          </aside>

          <main id="receipt" className="min-w-0 scroll-mt-4">
            {selected ? (
              <Receipt
                key={selected.id}
                task={selected}
                index={tasks.findIndex((t) => t.id === selected.id)}
                store={store}
              />
            ) : (
              <div className="zig rounded-t-md bg-paper px-8 pt-16 pb-20 text-center text-paper-ink">
                <p className="font-display text-3xl font-extrabold tracking-[-0.03em]">No receipts yet.</p>
                <p className="mt-2 text-paper-muted">Create a task, then log what it costs you.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function RulerLabel({ title, pct, className, style }: { title: string; pct: number; className: string; style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      style={style}
      className={`flex w-full items-center justify-between gap-2 px-3 font-mono text-xs font-medium whitespace-nowrap ${className}`}
    >
      <span className="truncate">{title}</span>
      <span className="hidden md:inline">{Math.round(pct)}%</span>
    </span>
  );
}

function Stat({ name, value, tone = "", last }: { name: string; value: string; tone?: string; last?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 px-4 py-4 sm:px-5 ${last ? "" : "border-r border-line"}`}>
      <span className={`${label} text-muted`}>{name}</span>
      <span className={`font-mono text-lg font-semibold tabular-nums sm:text-[22px] ${tone}`}>{value}</span>
    </div>
  );
}

function StatusTag({ status }: { status: Status }) {
  const dot =
    status === "doing" ? "bg-accent" : status === "done" ? "bg-paper" : "border border-muted bg-transparent";
  return (
    <span className={`${label} flex shrink-0 items-center gap-1.5 tracking-widest text-muted`}>
      <span className={`size-[7px] rounded-full ${dot}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

function NewTaskForm({ onCreate, onCancel }: { onCreate: (t: Omit<Task, "id" | "createdAt">) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [dueDate, setDueDate] = useState("");
  const field =
    "h-12 w-full rounded-xl border border-line bg-surface px-4 text-[15px] tracking-normal normal-case text-paper outline-none placeholder:text-faint focus:border-accent";

  return (
    <form
      className="grid gap-3 rounded-[18px] border border-line p-5 sm:grid-cols-[minmax(0,1fr)_160px_180px_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onCreate({ title: title.trim(), budget: Number(budget) || 0, status: "todo", dueDate: dueDate || undefined });
      }}
    >
      <label className={`${label} flex flex-col gap-2 text-muted`}>
        What&apos;s the goal?
        <input autoFocus className={`${field} font-sans`} placeholder="Paint the bedroom" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className={`${label} flex flex-col gap-2 text-muted`}>
        Budget
        <input className={`${field} font-mono`} type="number" min="0" placeholder="$0" value={budget} onChange={(e) => setBudget(e.target.value)} />
      </label>
      <label className={`${label} flex flex-col gap-2 text-muted`}>
        Due date
        <input className={`${field} font-mono`} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </label>
      <div className="flex items-end gap-2">
        <button type="button" onClick={onCancel} className="h-12 rounded-xl px-4 text-sm text-muted hover:text-paper">
          Cancel
        </button>
        <button disabled={!title.trim()} className="h-12 rounded-xl bg-accent px-5 text-sm font-semibold text-ink disabled:opacity-40">
          Create
        </button>
      </div>
    </form>
  );
}

function Receipt({ task, index, store }: { task: Task; index: number; store: Store }) {
  const items = store.expenses.filter((e) => e.taskId === task.id).sort((a, b) => b.date.localeCompare(a.date));
  const spent = items.reduce((s, e) => s + e.amount, 0);
  const left = task.budget - spent;
  const pct = pctOf(spent, task.budget);
  const tone = toneOf(pct);
  const isOver = tone === "over";

  const filled = Math.round(Math.min(pct, 100) / 2.5);
  const overflow = isOver ? Math.min(20, Math.max(1, Math.ceil((pct - 100) / 2.5))) : 0;

  const stamp = { over: "Over budget", near: "Watch it", ok: "On track" }[tone];
  const stampStyle = {
    over: "border-over-paper text-over-paper",
    near: "border-paper-ink text-paper-ink",
    ok: "border-paper-ink bg-accent text-paper-ink",
  }[tone];

  return (
    <article className="zig @container relative flex flex-col gap-7 rounded-t-md bg-paper px-5 pt-10 pb-16 text-paper-ink sm:px-12">
      <div
        key={stamp}
        className={`animate-stamp absolute top-6 right-4 rotate-[-9deg] rounded-lg border-[3px] px-3 py-1.5 font-display text-base font-extrabold tracking-[0.02em] uppercase sm:top-9 sm:right-12 sm:px-4 sm:py-2 sm:text-[22px] ${stampStyle}`}
      >
        {stamp}
      </div>

      <div className="flex flex-col gap-2.5 pr-28 sm:pr-44">
        <span className={`${label} tracking-[0.14em] text-paper-muted`}>
          Receipt · T-{String(index + 1).padStart(2, "0")}
        </span>
        <h2 className="font-display text-[clamp(32px,4vw,52px)] leading-[0.95] font-extrabold tracking-[-0.04em]">{task.title}</h2>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[13px] text-paper-muted">
          {task.dueDate && <span>Due {shortDate(task.dueDate, true)}</span>}
          <label className="flex items-center gap-1.5">
            Status:
            <select
              value={task.status}
              onChange={(e) => store.updateTask(task.id, { status: e.target.value as Status })}
              className="cursor-pointer rounded-md bg-transparent py-1 font-mono text-paper-ink underline decoration-dotted underline-offset-4 outline-none"
            >
              {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <span>
            {items.length} line item{items.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={() => confirm(`Delete "${task.title}" and its expenses?`) && store.deleteTask(task.id)}
            className="py-1 text-over-paper underline-offset-4 hover:underline"
          >
            Delete task
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="font-display leading-none font-extrabold tracking-[-0.04em]">
            <span className={`text-5xl tabular-nums sm:text-[64px] ${isOver ? "text-over-paper" : ""}`}>{Math.round(pct)}%</span>
            <span className="text-lg font-semibold tracking-[-0.01em] text-paper-muted"> of budget used</span>
          </div>
          <span className={`font-mono text-[15px] font-semibold tabular-nums ${isOver ? "text-over-paper" : ""}`}>
            {left >= 0 ? `${money(left)} left` : `${money(-left)} over`}
          </span>
        </div>
        <div className="flex h-[22px] gap-[3px]" aria-hidden="true">
          {Array.from({ length: 40 }, (_, i) => (
            <span key={i} className={`flex-1 rounded-xs transition-colors ${i < filled ? "bg-paper-ink" : "bg-paper-off"}`} />
          ))}
          {overflow > 0 && <span className="w-1.5 shrink-0" />}
          {Array.from({ length: overflow }, (_, i) => (
            <span key={`o${i}`} className="flex-1 rounded-xs bg-over-paper" />
          ))}
        </div>
        <div className="flex justify-between font-mono text-[11px] text-paper-muted">
          <span>$0</span>
          <span>50%</span>
          <span>{money(task.budget)}</span>
        </div>
      </div>

      <div className="border-t-2 border-dashed border-paper-line" />

      {items.length === 0 ? (
        <p className="py-4 text-center font-mono text-sm text-paper-muted">No line items yet. What did this cost you?</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((e) => (
            <li key={e.id} className="group flex items-baseline gap-3.5 py-2.5">
              <span className="w-14 shrink-0 font-mono text-xs text-paper-muted uppercase">{shortDate(e.date)}</span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-base font-medium">{e.description}</span>
                <span className={`${label} tracking-widest text-paper-muted`}>{e.category}</span>
              </span>
              <span className="min-w-6 flex-1 -translate-y-1.5 border-b-2 border-dotted border-paper-line" />
              <span className="font-mono text-base font-semibold tabular-nums">{money(e.amount)}</span>
              <button
                onClick={() => store.deleteExpense(e.id)}
                aria-label={`Delete ${e.description}`}
                className="-mr-2 grid size-8 shrink-0 place-items-center self-center rounded-md text-paper-muted opacity-0 group-hover:opacity-100 hover:text-over-paper focus:opacity-100 max-sm:opacity-60"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 border-t-4 border-double border-paper-ink pt-4 font-mono tabular-nums">
        <div className="flex items-center justify-between text-sm text-paper-muted">
          <span>Budget</span>
          <BudgetEditor value={task.budget} onChange={(budget) => store.updateTask(task.id, { budget })} />
        </div>
        <div className="flex justify-between text-sm text-paper-muted">
          <span>Spent</span>
          <span>{money(spent)}</span>
        </div>
        <div className={`flex items-baseline justify-between text-[22px] font-semibold ${isOver ? "text-over-paper" : ""}`}>
          <span>{left >= 0 ? "Left to spend" : "Over by"}</span>
          <span>{money(Math.abs(left))}</span>
        </div>
      </div>

      <NewExpenseForm onAdd={(e) => store.addExpense({ ...e, taskId: task.id })} />

      <p className={`${label} text-center tracking-[0.3em] text-paper-muted`}>*** thank you for spending on purpose ***</p>
    </article>
  );
}

function BudgetEditor({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (!editing)
    return (
      <button
        className="underline decoration-dotted underline-offset-4 hover:text-paper-ink"
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
      aria-label="Budget"
      className="w-28 rounded-md border border-paper-line bg-paper-hi px-2 py-0.5 text-right text-paper-ink outline-none"
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
  const field =
    "h-[46px] w-full rounded-[10px] border border-paper-line bg-paper-hi px-3.5 text-[15px] tracking-normal normal-case text-paper-ink outline-none focus:border-paper-ink";
  const lbl = `${label} flex flex-col gap-1.5 text-paper-muted`;

  return (
    <form
      className="grid grid-cols-2 gap-2.5 rounded-[14px] border-2 border-paper-ink p-4 @xl:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onAdd({ description: description.trim(), amount: Number(amount), category, date });
        setDescription("");
        setAmount("");
      }}
    >
      <label className={`${lbl} col-span-full`}>
        Add a line item
        <input className={`${field} font-sans`} placeholder="What did you pay for?" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label className={lbl}>
        Amount
        <input className={`${field} font-mono`} type="number" min="0" step="0.01" placeholder="$0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <label className={lbl}>
        Category
        <select className={`${field} font-sans`} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className={lbl}>
        Date
        <input className={`${field} font-mono`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <div className="flex flex-col justify-end">
        <button disabled={!valid} className="h-[46px] rounded-[10px] bg-paper-ink text-sm font-semibold text-paper disabled:opacity-40">
          Add to receipt
        </button>
      </div>
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
    <section className="mt-4 flex flex-col gap-[18px] rounded-[18px] border border-line p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-[22px] font-bold tracking-[-0.02em]">Where it went</h2>
        <span className={`${label} text-muted`}>by category</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nothing spent yet.</p>
      ) : (
        rows.map((r, i) => {
          const n = Math.max(1, Math.round((r.total / max) * 24));
          return (
            <div key={r.category} className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span>{r.category}</span>
                <span className="font-mono tabular-nums">
                  {money(r.total)} <span className="text-muted">{Math.round((r.total / sum) * 100)}%</span>
                </span>
              </div>
              <div className="flex gap-[3px]" aria-hidden="true">
                {Array.from({ length: 24 }, (_, b) => (
                  <span
                    key={b}
                    className={`h-3.5 flex-1 rounded-xs ${b < n ? (i === 0 ? "bg-accent" : "bg-paper") : "bg-well"}`}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}
