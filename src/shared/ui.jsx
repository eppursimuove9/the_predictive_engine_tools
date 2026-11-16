import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Lock, ChevronRight, Info, Download, FileText, Mail, Loader2, BookOpen, Target, RotateCcw } from 'lucide-react';
import { clamp } from './format.js';

// --- CONTROL COMPONENT (SLIDER + INPUT) ---
export function ControlSlider({ 
  label, value, min, max, step = 1, setter, suffix = "", prefix = "", tooltip, 
  highlightClass = "text-slate-700 bg-slate-50 border-slate-200 focus:ring-slate-500", 
  accentClass = "accent-slate-600" 
}) {
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => { setInputValue(value.toString()); }, [value]);

  const handleInputChange = (e) => setInputValue(e.target.value);
  const handleInputBlur = () => {
    let parsed = parseFloat(inputValue);
    const finalValue = clamp(parsed, min, max);
    setInputValue(finalValue.toString());
    setter(finalValue);
  };
  const handleSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    setInputValue(val.toString());
    setter(val);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="font-semibold text-sm text-slate-700 flex items-center gap-1">
          {label}
          {tooltip && <HelpTip text={tooltip} />}
        </label>
        <div className="flex items-center">
          {prefix && <span className="text-slate-500 font-semibold mr-1">{prefix}</span>}
          <input 
            type="number" value={inputValue} min={min} max={max} step={step}
            onChange={handleInputChange} onBlur={handleInputBlur}
            className={`w-24 text-right font-bold border rounded px-2 py-1 outline-none focus:ring-2 transition-all ${highlightClass}`}
          />
          {suffix && <span className="text-slate-500 font-semibold ml-1">{suffix}</span>}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={handleSliderChange} className={`w-full cursor-pointer ${accentClass}`} />
    </div>
  );
}


export function HelpTip({ text }) {
  const [open, setOpen] = useState(false);
  const pointer = useRef('');
  return (
    <span
      className="relative inline-flex"
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setOpen(true); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setOpen(false); }}
    >
      <button
        type="button"
        aria-label="What is this?"
        aria-expanded={open}
        onPointerDown={(e) => { pointer.current = e.pointerType; }}
        onClick={() => { if (pointer.current !== 'mouse') setOpen((o) => !o); }}
        onBlur={() => setOpen(false)}
        className="text-slate-400 hover:text-slate-700 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f52e01]"
      >
        <Info className="w-4 h-4" />
      </button>
      {open && (
        <span role="tooltip" className="absolute z-30 left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 rounded-lg bg-[#0B1120] text-white text-xs leading-snug font-normal normal-case tracking-normal p-3 shadow-xl">
          {text}
        </span>
      )}
    </span>
  );
}


// An optional assumption: the user can leave it out of the case. Off means the value is 0 (no effect).
export function OptionalControl({ label, value, onChange, restoreTo, children }) {
  const last = useRef(value > 0 ? value : restoreTo);
  const [off, setOff] = useState(value === 0);
  useEffect(() => { if (value > 0) { last.current = value; setOff(false); } }, [value]);
  const toggle = () => {
    if (off) { setOff(false); onChange(last.current > 0 ? last.current : restoreTo); }
    else { setOff(true); onChange(0); }
  };
  return (
    <div>
      <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-800">
        <input type="checkbox" checked={!off} onChange={toggle} className="accent-[#f52e01] w-4 h-4" />
        Include {label}
      </label>
      {off ? <p className="mt-1 ml-6 text-sm text-slate-600">Not included. The result is calculated without it.</p> : <div className="mt-3">{children}</div>}
    </div>
  );
}

export function CollapsibleSection({ title, icon, locked, onUnlock, children }) {
  return (
    <details className="group bg-white rounded-2xl shadow-sm border border-slate-200 p-5 lg:p-6">
      <summary
        className="cursor-pointer font-bold text-slate-900 flex items-center gap-2 list-none"
        onClick={(e) => { if (locked) { e.preventDefault(); onUnlock(); } }}
      >
        {icon} {title}
        {locked ? (
          <span className="ml-auto flex items-center gap-1 text-sm font-bold text-[#f52e01]"><Lock className="w-4 h-4" /> Unlock</span>
        ) : (
          <>
            <span className="ml-auto text-sm font-semibold text-slate-600 group-open:hidden">Show</span>
            <span className="ml-auto text-sm font-semibold text-slate-600 hidden group-open:inline">Hide</span>
          </>
        )}
      </summary>
      {!locked && <div className="mt-4">{children}</div>}
    </details>
  );
}


export function LockedSection({ locked, onUnlock, children }) {
  return (
    <div className="relative">
      <div className={locked ? 'blur-sm opacity-40 pointer-events-none select-none' : ''} aria-hidden={locked}>{children}</div>
      {locked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-4">
          <Lock className="w-8 h-8 text-[#f52e01] mb-2" />
          <p className="text-slate-900 text-sm font-bold mb-3">Subscribe to unlock</p>
          <button onClick={onUnlock} className="bg-[#f52e01] hover:bg-[#ff4117] text-white text-sm font-bold py-2 px-5 rounded-lg flex items-center gap-1">Unlock <ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}


// ============================================================================
// Generic building blocks shared by every tool
// ============================================================================

export function Card({ title, icon, note, children, className = '' }) {
  return (
    <div className={`bg-white p-5 lg:p-6 rounded-2xl shadow-sm border border-slate-200 ${className}`}>
      {title && <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">{icon}{title}</h3>}
      {note && <p className="text-sm text-slate-600 mt-1 max-w-3xl">{note}</p>}
      <div className={title ? 'mt-4' : ''}>{children}</div>
    </div>
  );
}

export function ToolHeader({ eyebrow, title, accent, blurb }) {
  return (
    <div className="space-y-3">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold uppercase tracking-widest">{eyebrow}</div>
      <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900">{title} <span className="text-[#f52e01]">{accent}</span></h1>
      <p className="text-lg text-slate-600 max-w-4xl">{blurb}</p>
    </div>
  );
}

export function PresetBar({ presets, activeId, onLoad, onReset }) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-600">Start from an example</div>
        <button onClick={onReset} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"><RotateCcw className="w-3.5 h-3.5" /> New simulation</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {presets.map((pr) => {
          const active = activeId === pr.id;
          return (
            <button key={pr.id} onClick={() => onLoad(pr)} aria-pressed={active}
              className={`rounded-lg border-2 px-2 py-2 text-left transition-colors ${active ? 'border-[#f52e01] bg-orange-50' : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}>
              <div className={`text-sm font-bold leading-tight flex items-center justify-between gap-1 ${active ? 'text-[#f52e01]' : 'text-slate-900'}`}>{pr.name}{active && <span aria-hidden="true">✓</span>}</div>
              <div className="text-xs text-slate-600 leading-tight">{pr.note}</div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-600 mt-2 leading-snug">{activeId ? 'Example loaded. Change any value and it becomes your own case.' : 'Illustrative cases to see how the tool works. Replace them with your own numbers.'}</p>
    </div>
  );
}

export function StartingValuesNote() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 leading-snug">
      <strong>Starting values are examples.</strong> Replace them with your own numbers.
    </div>
  );
}

const TONE_BORDER = { good: 'border-l-emerald-500', mixed: 'border-l-amber-500', bad: 'border-l-red-500' };
export function VerdictCard({ verdict }) {
  return (
    <div className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 ${TONE_BORDER[verdict.tone] || 'border-l-slate-400'}`}>
      <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">In plain words</div>
      <p className="text-slate-900 text-base leading-relaxed">{verdict.headline}</p>
      {verdict.detail && <p className="text-slate-700 text-base leading-relaxed mt-2">{verdict.detail}</p>}
    </div>
  );
}

const KPI_TONE = { good: 'text-emerald-600', bad: 'text-red-600', mixed: 'text-amber-600', neutral: 'text-slate-900' };
export function KpiGrid({ items }) {
  const cols = items.length === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : (items.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3');
  return (
    <div className={`grid grid-cols-1 ${cols} gap-4`}>
      {items.map((k) => (
        <div key={k.label} className="min-w-0 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-slate-600 text-xs font-bold uppercase tracking-wide mb-2 leading-tight">{k.label}</div>
          <div className={`text-3xl font-black tabular-nums leading-tight break-words ${KPI_TONE[k.tone || 'neutral']}`}>{k.value}</div>
          {k.note && <div className="text-sm text-slate-600 mt-1 leading-snug">{k.note}</div>}
        </div>
      ))}
    </div>
  );
}

export function ToolLayout({ controls, results }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const jump = () => { try { ref.current && ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { /* ignore */ } };
  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-4 space-y-6">{controls}</div>
        <div ref={ref} className="xl:col-span-8 space-y-6 min-w-0 scroll-mt-4">{results}</div>
      </div>
      {!inView && (
        <button onClick={jump} className="xl:hidden fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-[#f52e01] hover:bg-[#ff4117] text-white text-sm font-bold px-5 py-3 shadow-lg">
          Go to results <ChevronRight className="w-4 h-4 rotate-90" />
        </button>
      )}
    </>
  );
}

export function ControlGroup({ title, children }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <h2 className="text-lg font-bold flex items-center gap-2 border-b pb-4 mb-6 text-slate-800">{title}</h2>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

export function AdvancedGroup({ title = 'Advanced', summary, children }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-slate-50">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-700 flex items-center justify-between gap-3">
        <span>{title}{summary && <span className="block text-xs font-normal text-slate-600 mt-0.5">{summary}</span>}</span>
        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 transition-transform group-open:rotate-90" />
      </summary>
      <div className="px-4 pb-4 pt-4 space-y-6 border-t border-slate-200">{children}</div>
    </details>
  );
}

export function ScenarioTable({ columns, rows, baseIndex = 1 }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-600">
            <th className="py-2 pr-3 font-bold">Result</th>
            {columns.map((c, i) => <th key={c} className={`py-2 px-3 font-bold text-right ${i === baseIndex ? 'text-[#f52e01]' : ''}`}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-slate-100">
              <td className="py-2 pr-3 text-slate-700">{r.label}</td>
              {r.values.map((v, i) => <td key={i} className={`py-2 px-3 text-right font-bold tabular-nums ${i === baseIndex ? 'bg-orange-50 text-slate-900' : 'text-slate-700'}`}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// rows: [{ label, down, up }]  (down <= 0 <= up, in the units of the result)
export function TornadoChart({ rows, format, belowLabel = 'If worse', aboveLabel = 'If better' }) {
  if (!rows.length) return <div className="h-24 flex items-center justify-center text-sm text-slate-600">No input changes this result.</div>;
  return (
    <div className="w-full" style={{ height: Math.max(180, rows.length * 36 + 60) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" stackOffset="sign" margin={{ top: 8, right: 24, left: 8, bottom: 8 }} barCategoryGap="25%">
          <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={format} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis type="category" dataKey="label" width={160} axisLine={false} tickLine={false} tick={{ fill: '#0B1120', fontWeight: 600, fontSize: 12 }} />
          <RechartsTooltip formatter={(v, n) => [format(v), n === 'down' ? belowLabel : aboveLabel]} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
          <ReferenceLine x={0} stroke="#0B1120" strokeWidth={1.5} />
          <Bar dataKey="down" stackId="t" fill="#ef4444" radius={4} />
          <Bar dataKey="up" stackId="t" fill="#10b981" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const STRENGTH = {
  survey: { label: 'Survey data', cls: 'bg-emerald-50 text-emerald-800' },
  secondary: { label: 'Secondary source', cls: 'bg-amber-50 text-amber-800' },
  rule: { label: 'Rule of thumb', cls: 'bg-slate-100 text-slate-700' },
};
// items: [{ label, value (number|null), unit, range:[lo,hi], note, source, url, strength, noStatus }]
export function BenchmarkList({ items, planning }) {
  return (
    <div>
      <p className="text-sm text-slate-600">Reference ranges from public sources, mostly US SaaS. They are not a standard, and a value outside them is not wrong, but be ready to explain it. The label on each one says how solid the source is.</p>
      <div className="mt-4 space-y-4">
        {items.map((b) => {
          const v = b.value;
          const status = v === null || v === undefined || b.noStatus ? null : (v < b.range[0] ? 'Below reference range' : (v > b.range[1] ? 'Above reference range' : 'Within reference range'));
          const st = STRENGTH[b.strength] || STRENGTH.rule;
          return (
            <div key={b.label} className="border-t border-slate-100 pt-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-slate-900">{b.label}</strong>
                <span className="flex flex-wrap gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                  {status && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${status.startsWith('Within') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{status}</span>}
                </span>
              </div>
              <div className="text-slate-700 mt-1">Your value: <strong>{v === null || v === undefined ? 'n/a' : `${Math.round(v * 100) / 100} ${b.unit}`}</strong>. Reference: {b.refText || `${b.range[0]} to ${b.range[1]} ${b.unit}`}.</div>
              <div className="text-slate-600 mt-1">{b.note} Source: <a href={b.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-900">{b.source}</a></div>
            </div>
          );
        })}
        {planning && <div className="border-t border-slate-100 pt-4 text-sm text-slate-600"><strong className="text-slate-900">Planning assumptions.</strong> {planning}</div>}
      </div>
    </div>
  );
}

export function ExportPanel({ isUnlocked, onUnlock, onPdf, onXlsx, onShare }) {
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState(false);
  const run = async (kind, fn) => {
    if (!isUnlocked) { onUnlock(); return; }
    setBusy(kind);
    try { await fn(); } catch (e) { console.error(`${kind} export failed`, e); alert('Something went wrong creating the file. Please try again.'); }
    setBusy('');
  };
  const share = async () => { const ok = await onShare(); if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); } };
  const btn = (kind, label, doneLabel, Icon, dark, fn) => (
    <button onClick={() => run(kind, fn)} disabled={busy === kind}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold border ${isUnlocked ? dark : 'bg-orange-50 text-[#f52e01] border-orange-200 hover:bg-orange-100'}`}>
      {busy === kind ? <Loader2 className="w-4 h-4 animate-spin" /> : (isUnlocked ? <Icon className="w-4 h-4" /> : <Lock className="w-4 h-4" />)}
      {busy === kind ? 'Working...' : (isUnlocked ? label : doneLabel)}
    </button>
  );
  return (
    <Card title="Export and share" icon={<Download className="w-5 h-5 text-slate-700" />} note="Your inputs stay in your browser. Nothing is stored on our servers.">
      <div className="flex flex-wrap gap-3">
        {btn('pdf', 'Download PDF', 'Unlock PDF', Download, 'bg-[#0B1120] text-white border-[#0B1120] hover:bg-slate-800', onPdf)}
        {btn('xlsx', 'Download Excel', 'Unlock Excel', FileText, 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700', onXlsx)}
        <button onClick={share} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold border border-slate-300 text-slate-700 hover:bg-slate-50">
          <Mail className="w-4 h-4" /> {copied ? 'Link copied' : 'Copy share link'}
        </button>
      </div>
    </Card>
  );
}

// items: [{ h, p }]
export function HowToRead({ items }) {
  return (
    <details className="group bg-white rounded-2xl shadow-sm border border-slate-200 p-5 lg:p-6">
      <summary className="cursor-pointer font-bold text-slate-900 flex items-center gap-2 list-none">
        <Info className="w-5 h-5 text-slate-500" /> How to read these results
        <span className="ml-auto text-sm font-semibold text-slate-600 group-open:hidden">Show</span>
        <span className="ml-auto text-sm font-semibold text-slate-600 hidden group-open:inline">Hide</span>
      </summary>
      <div className="mt-4 space-y-4 text-sm text-slate-700 leading-relaxed">
        {items.map((it) => <p key={it.h}><strong className="text-slate-900">{it.h}.</strong> {it.p}</p>)}
        <p className="text-xs text-slate-600">These are estimates to support a decision, based on the numbers you enter. They are not guarantees.</p>
      </div>
    </details>
  );
}

export { BookOpen, Target };
