import { ChevronRight } from 'lucide-react';
import { Link } from './shared/router.jsx';
import { ICONS } from './shared/icons.js';
import { TOOLS, CATEGORIES, findCategory, toolsIn } from './registry.js';

function ToolCard({ t }) {
  const Icon = ICONS[t.icon] || ICONS.Calculator;
  const cat = findCategory(t.category);
  return (
    <Link to={`/tools/${t.slug}`} className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col hover:border-[#f52e01] hover:shadow-md transition">
      <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center mb-4"><Icon className="w-5 h-5 text-[#f52e01]" /></div>
      <div className="text-xs font-bold uppercase tracking-wider text-slate-600">{cat ? cat.name : ''}</div>
      <h3 className="text-xl font-bold text-slate-900 mt-1">{t.title}</h3>
      <p className="text-slate-600 mt-2 flex-1">{t.blurb}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#f52e01]">Open tool <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></span>
    </Link>
  );
}

function Chips({ active }) {
  const base = 'px-4 py-2 rounded-full text-sm font-bold border transition';
  const on = 'bg-[#0B1120] text-white border-[#0B1120]';
  const off = 'bg-white text-slate-700 border-slate-300 hover:border-slate-500';
  return (
    <nav aria-label="Tool categories" className="flex flex-wrap gap-2">
      <Link to="/" className={`${base} ${!active ? on : off}`}>All tools ({TOOLS.length})</Link>
      {CATEGORIES.map((c) => <Link key={c.slug} to={`/category/${c.slug}`} className={`${base} ${active === c.slug ? on : off}`}>{c.name} ({toolsIn(c.slug).length})</Link>)}
    </nav>
  );
}

// Home: every tool grouped by category. Category page: only that category.
export default function Home({ category }) {
  const cat = category ? findCategory(category) : null;
  const groups = cat ? [cat] : CATEGORIES;
  return (
    <>
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold uppercase tracking-widest">{cat ? cat.name : 'GTM and RevOps'}</div>
        <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight text-slate-900">{cat ? cat.name : <>Business case tools for <span className="text-[#f52e01]">go-to-market</span> teams</>}</h1>
        <p className="text-lg text-slate-600 max-w-3xl">{cat ? cat.blurb : 'Free calculators that turn your sales, marketing, finance and engineering numbers into a clear answer in plain words. Built to take to your CFO, your board or your next planning meeting.'}</p>
      </div>
      <Chips active={cat ? cat.slug : null} />
      {groups.map((c) => (
        <section key={c.slug} className="space-y-4" aria-labelledby={`cat-${c.slug}`}>
          {!cat && (
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 id={`cat-${c.slug}`} className="text-2xl font-extrabold text-slate-900">{c.name}</h2>
                <p className="text-slate-600">{c.blurb}</p>
              </div>
              <Link to={`/category/${c.slug}`} className="text-sm font-bold text-[#f52e01] hover:underline">See only {c.name}</Link>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{toolsIn(c.slug).map((t) => <ToolCard key={t.slug} t={t} />)}</div>
        </section>
      ))}
      <p className="text-sm text-slate-600">Every tool starts with example numbers. Replace them with your own, and nothing you type leaves your browser.</p>
    </>
  );
}
