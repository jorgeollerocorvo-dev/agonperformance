"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { saveProgram, type EditorProgram, type EditorDay, type EditorBlock, type EditorMovement } from "./actions";

type Dict = {
  save: string;
  saved: string;
  addBlock: string;
  addMovement: string;
  addWeek: string;
  duplicateDay: string;
  clear: string;
  findVideo: string;
  notes: string;
  reps: string;
  sets: string;
  load: string;
  rest: string;
  movementName: string;
  blockLabel: string;
  blockFormat: string;
  dayFocus: string;
  dayIntensity: string;
  week: string;
  day: string;
  rest_day: string;
};

export default function ProgramBuilder({
  initial,
  dict,
  lang,
}: {
  initial: EditorProgram;
  dict: Dict;
  lang: string;
}) {
  const [prog, setProg] = useState<EditorProgram>(initial);
  const [activeWeek, setActiveWeek] = useState(0);
  const [pending, start] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const save = () => {
    start(async () => {
      await saveProgram(prog);
      setSavedAt(Date.now());
    });
  };

  const patchWeek = (wi: number, mut: (w: EditorProgram["weeks"][number]) => void) => {
    setProg((p) => {
      const weeks = p.weeks.map((w, i) => (i === wi ? structuredClone(w) : w));
      mut(weeks[wi]);
      return { ...p, weeks };
    });
  };

  const patchDay = (wi: number, di: number, mut: (d: EditorDay) => void) => {
    patchWeek(wi, (w) => mut(w.days[di]));
  };

  const patchBlock = (wi: number, di: number, bi: number, mut: (b: EditorBlock) => void) => {
    patchDay(wi, di, (d) => mut(d.blocks[bi]));
  };

  const patchMovement = (
    wi: number, di: number, bi: number, mi: number,
    mut: (m: EditorMovement) => void,
  ) => {
    patchBlock(wi, di, bi, (b) => mut(b.movements[mi]));
  };

  const addBlock = (wi: number, di: number) => {
    patchDay(wi, di, (d) => {
      d.blocks.push({
        id: null,
        blockCode: String.fromCharCode(65 + d.blocks.length),
        label: "",
        format: "",
        restSec: null,
        notes: null,
        movements: [],
      });
    });
  };

  const addMovement = (wi: number, di: number, bi: number) => {
    patchBlock(wi, di, bi, (b) => {
      b.movements.push({
        id: null,
        name: "",
        sets: null, reps: null, load: null, rest: null, notes: null,
        youtubeUrl: null,
        isTest: false,
      });
    });
  };

  const removeBlock = (wi: number, di: number, bi: number) => {
    patchDay(wi, di, (d) => { d.blocks.splice(bi, 1); });
  };
  const removeMovement = (wi: number, di: number, bi: number, mi: number) => {
    patchBlock(wi, di, bi, (b) => { b.movements.splice(mi, 1); });
  };

  const duplicateDay = (wi: number, srcDi: number) => {
    const dst = window.prompt(`${dict.duplicateDay}: target day (1-7)`);
    if (!dst) return;
    const di = parseInt(dst, 10) - 1;
    if (isNaN(di) || di < 0) return;
    patchWeek(wi, (w) => {
      if (!w.days[di]) return;
      const src = w.days[srcDi];
      w.days[di] = {
        ...w.days[di],
        focus: src.focus,
        intensity: src.intensity,
        notes: src.notes,
        blocks: structuredClone(src.blocks).map((b) => ({
          ...b,
          id: null,
          movements: b.movements.map((m) => ({ ...m, id: null })),
        })),
      };
    });
  };

  const clearDay = (wi: number, di: number) => {
    if (!window.confirm(dict.clear + "?")) return;
    patchDay(wi, di, (d) => { d.blocks = []; d.focus = null; d.notes = null; });
  };

  const addWeek = () => {
    setProg((p) => {
      const lastWeek = p.weeks.at(-1);
      const lastDate = lastWeek?.days.at(-1)?.date ? new Date(lastWeek.days.at(-1)!.date) : new Date(p.startDate);
      lastDate.setDate(lastDate.getDate() + 1);
      const days: EditorDay[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(lastDate);
        d.setDate(d.getDate() + i);
        return {
          id: null,
          date: d.toISOString().slice(0, 10),
          day: d.toLocaleDateString("en-US", { weekday: "long" }),
          focus: null, intensity: null, notes: null,
          blocks: [],
        };
      });
      return {
        ...p,
        weeks: [...p.weeks, {
          id: null,
          weekNumber: p.weeks.length + 1,
          weekLabel: `Week ${p.weeks.length + 1}`,
          days,
        }],
      };
    });
    setActiveWeek(prog.weeks.length);
  };

  const week = prog.weeks[activeWeek];

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={prog.title}
          onChange={(e) => setProg({ ...prog, title: e.target.value })}
          className="text-2xl sm:text-3xl font-bold bg-transparent border-b border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] outline-none flex-1 min-w-0"
        />
        <button
          onClick={save}
          disabled={pending}
          className="rounded-full bg-[var(--primary)] text-white px-5 py-2 font-medium hover:bg-[var(--primary-hover)] disabled:opacity-60"
        >
          {pending ? "…" : dict.save}
        </button>
        {savedAt && !pending && <span className="text-sm text-[var(--success)]">✓ {dict.saved}</span>}
      </div>

      <input
        value={prog.goal ?? ""}
        onChange={(e) => setProg({ ...prog, goal: e.target.value })}
        placeholder="Goal"
        className="w-full text-[var(--ink-muted)] bg-transparent outline-none border-b border-transparent hover:border-[var(--border)] focus:border-[var(--primary)]"
      />

      {/* Week tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-[var(--border)]">
        {prog.weeks.map((w, i) => (
          <button
            key={i}
            onClick={() => setActiveWeek(i)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
              i === activeWeek
                ? "bg-[var(--ink)] text-white"
                : "bg-white border border-[var(--border)] hover:bg-[var(--surface-2)]"
            }`}
          >
            {dict.week} {w.weekNumber}
          </button>
        ))}
        <button
          onClick={addWeek}
          className="shrink-0 rounded-full px-4 py-1.5 text-sm text-[var(--primary)] hover:bg-[var(--primary-soft)]"
        >
          + {dict.addWeek}
        </button>
      </div>

      {/* 7-day grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {week?.days.map((day, di) => (
          <DayCard
            key={di}
            day={day}
            index={di}
            dict={dict}
            onFocus={(v) => patchDay(activeWeek, di, (d) => { d.focus = v; })}
            onNotes={(v) => patchDay(activeWeek, di, (d) => { d.notes = v; })}
            onIntensity={(v) => patchDay(activeWeek, di, (d) => { d.intensity = v; })}
            onAddBlock={() => addBlock(activeWeek, di)}
            onDuplicate={() => duplicateDay(activeWeek, di)}
            onClear={() => clearDay(activeWeek, di)}
            onBlockPatch={(bi, fn) => patchBlock(activeWeek, di, bi, fn)}
            onBlockRemove={(bi) => removeBlock(activeWeek, di, bi)}
            onMovementPatch={(bi, mi, fn) => patchMovement(activeWeek, di, bi, mi, fn)}
            onMovementAdd={(bi) => addMovement(activeWeek, di, bi)}
            onMovementRemove={(bi, mi) => removeMovement(activeWeek, di, bi, mi)}
          />
        ))}
      </div>

      {/* Floating save bar for mobile */}
      <div className="sticky bottom-4 flex justify-center">
        <button
          onClick={save}
          disabled={pending}
          className="sm:hidden rounded-full bg-[var(--primary)] text-white px-6 py-3 font-medium shadow-lg disabled:opacity-60"
        >
          {pending ? "Saving…" : dict.save}
        </button>
      </div>
    </div>
  );
}

function DayCard({
  day, index, dict,
  onFocus, onNotes, onIntensity,
  onAddBlock, onDuplicate, onClear,
  onBlockPatch, onBlockRemove,
  onMovementPatch, onMovementAdd, onMovementRemove,
}: {
  day: EditorDay;
  index: number;
  dict: Dict;
  onFocus: (v: string) => void;
  onNotes: (v: string) => void;
  onIntensity: (v: string) => void;
  onAddBlock: () => void;
  onDuplicate: () => void;
  onClear: () => void;
  onBlockPatch: (bi: number, fn: (b: EditorBlock) => void) => void;
  onBlockRemove: (bi: number) => void;
  onMovementPatch: (bi: number, mi: number, fn: (m: EditorMovement) => void) => void;
  onMovementAdd: (bi: number) => void;
  onMovementRemove: (bi: number, mi: number) => void;
}) {
  const isRest = day.blocks.length === 0 && !day.focus;

  return (
    <div className="rounded-2xl bg-white border border-[var(--border)] flex flex-col">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-[var(--border)] flex items-center gap-2">
        <div className="flex-1">
          <div className="text-xs font-semibold text-[var(--ink-muted)]">
            {dict.day} {index + 1}
          </div>
          <div className="text-xs text-[var(--ink-subtle)]">{day.day} · {day.date.slice(5)}</div>
        </div>
        <div className="flex gap-1">
          <IconButton title={dict.duplicateDay} onClick={onDuplicate}>
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="11" height="11" rx="2"/><rect x="4" y="4" width="11" height="11" rx="2"/></svg>
          </IconButton>
          <IconButton title={dict.clear} onClick={onClear}>
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
          </IconButton>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3 flex-1">
        <div className="flex gap-1 items-center">
          <input
            value={day.focus ?? ""}
            onChange={(e) => onFocus(e.target.value)}
            placeholder={dict.dayFocus}
            className="flex-1 text-sm bg-transparent border-b border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] outline-none font-medium"
          />
          <select
            value={day.intensity ?? ""}
            onChange={(e) => onIntensity(e.target.value)}
            className="text-xs rounded-full border border-[var(--border)] px-2 py-0.5 bg-white"
          >
            <option value="">—</option>
            <option value="Light">Light</option>
            <option value="Moderate">Moderate</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        {isRest && (
          <p className="text-sm text-[var(--ink-subtle)] italic">{dict.rest_day}</p>
        )}

        {day.blocks.map((b, bi) => (
          <BlockEditor
            key={bi}
            block={b}
            dict={dict}
            onPatch={(fn) => onBlockPatch(bi, fn)}
            onRemove={() => onBlockRemove(bi)}
            onMovementPatch={(mi, fn) => onMovementPatch(bi, mi, fn)}
            onMovementAdd={() => onMovementAdd(bi)}
            onMovementRemove={(mi) => onMovementRemove(bi, mi)}
          />
        ))}

        <button
          onClick={onAddBlock}
          className="w-full rounded-lg border border-dashed border-[var(--border)] px-2 py-2 text-xs text-[var(--ink-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary-soft)]"
        >
          + {dict.addBlock}
        </button>
      </div>
    </div>
  );
}

function BlockEditor({
  block, dict, onPatch, onRemove, onMovementPatch, onMovementAdd, onMovementRemove,
}: {
  block: EditorBlock;
  dict: Dict;
  onPatch: (fn: (b: EditorBlock) => void) => void;
  onRemove: () => void;
  onMovementPatch: (mi: number, fn: (m: EditorMovement) => void) => void;
  onMovementAdd: () => void;
  onMovementRemove: (mi: number) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-2 space-y-2 bg-[var(--surface-2)]/50">
      <div className="flex gap-1 items-center">
        <input
          value={block.blockCode}
          onChange={(e) => onPatch((b) => { b.blockCode = e.target.value; })}
          className="w-10 text-center font-semibold text-[var(--primary)] bg-transparent border-b border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] outline-none"
        />
        <input
          value={block.label ?? ""}
          onChange={(e) => onPatch((b) => { b.label = e.target.value; })}
          placeholder={dict.blockLabel}
          className="flex-1 text-sm font-medium bg-transparent border-b border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] outline-none"
        />
        <button onClick={onRemove} className="text-[var(--ink-subtle)] hover:text-[var(--danger)] px-1">✕</button>
      </div>
      <input
        value={block.format ?? ""}
        onChange={(e) => onPatch((b) => { b.format = e.target.value; })}
        placeholder={dict.blockFormat}
        className="w-full text-xs bg-transparent border-b border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] outline-none text-[var(--ink-muted)]"
      />

      <ul className="space-y-1">
        {block.movements.map((m, mi) => (
          <li key={mi} className="rounded-lg bg-white border border-[var(--border)] p-2 space-y-1">
            <div className="flex gap-1 items-center">
              <input
                value={m.name}
                onChange={(e) => onMovementPatch(mi, (v) => { v.name = e.target.value; })}
                placeholder={dict.movementName}
                className="flex-1 text-sm font-medium bg-transparent outline-none"
              />
              <a
                title={dict.findVideo}
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(m.name + " demo")}`}
                target="_blank" rel="noreferrer"
                className="text-xs text-[var(--primary)] hover:underline px-1"
              >🎥</a>
              <button onClick={() => onMovementRemove(mi)} className="text-xs text-[var(--ink-subtle)] hover:text-[var(--danger)] px-1">✕</button>
            </div>
            <div className="grid grid-cols-4 gap-1 text-xs">
              <input value={m.sets ?? ""} onChange={(e) => onMovementPatch(mi, (v) => { v.sets = e.target.value; })} placeholder={dict.sets} className={tinyInput} />
              <input value={m.reps ?? ""} onChange={(e) => onMovementPatch(mi, (v) => { v.reps = e.target.value; })} placeholder={dict.reps} className={tinyInput} />
              <input value={m.load ?? ""} onChange={(e) => onMovementPatch(mi, (v) => { v.load = e.target.value; })} placeholder={dict.load} className={tinyInput} />
              <input value={m.rest ?? ""} onChange={(e) => onMovementPatch(mi, (v) => { v.rest = e.target.value; })} placeholder={dict.rest} className={tinyInput} />
            </div>
            <input
              value={m.youtubeUrl ?? ""}
              onChange={(e) => onMovementPatch(mi, (v) => { v.youtubeUrl = e.target.value; })}
              placeholder="YouTube URL"
              className="w-full text-xs bg-[var(--surface-2)] rounded px-2 py-1 outline-none"
            />
            <input
              value={m.notes ?? ""}
              onChange={(e) => onMovementPatch(mi, (v) => { v.notes = e.target.value; })}
              placeholder={dict.notes}
              className="w-full text-xs bg-transparent outline-none text-[var(--ink-muted)]"
            />
          </li>
        ))}
      </ul>

      <button
        onClick={onMovementAdd}
        className="w-full text-xs text-[var(--primary)] hover:underline py-1"
      >
        + {dict.addMovement}
      </button>
    </div>
  );
}

function IconButton({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-6 h-6 grid place-items-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
    >
      {children}
    </button>
  );
}

const tinyInput = "rounded border border-[var(--border)] px-2 py-1 bg-white outline-none focus:border-[var(--primary)]";
