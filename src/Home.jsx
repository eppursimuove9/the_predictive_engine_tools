import { Calculator, Target, Users, TrendingUp, PieChart, ChevronRight } from 'lucide-react';
import { Link } from './shared/router.jsx';
import { TOOLS } from './registry.js';

const ICONS = { Calculator, Target, Users, TrendingUp, PieChart };

export default function Home() {
  return (
    <>
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold uppercase tracking-widest">GTM and RevOps</div>
        <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight text-slate-900">Business case tools for <span className="text-[#f52e01]">go-to-market</span> teams</h1>
        <p className="text-lg text-slate-600 max-w-3xl">Free calculators that turn your sales, marketing and retention numbers into a clear answer in plain words. Built to take to your CFO, your board or your next planning meeting.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {TOOLS.map((t) => {
          const Icon = ICONS[t.icon] || Calculator;
          return (
            <Link key={t.slug} to={`/tools/${t.slug}`} className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col hover:border-[#f52e01] hover:shadow-md transition">
              <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center mb-4"><Icon className="w-5 h-5 text-[#f52e01]" /></div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600">{t.area}</div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">{t.title}</h2>
              <p className="text-slate-600 mt-2 flex-1">{t.blurb}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#f52e01]">Open tool <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          );
        })}
      </div>
      <p className="text-sm text-slate-600">Every tool starts with example numbers. Replace them with your own, and nothing you type leaves your browser.</p>
    </>
  );
}
