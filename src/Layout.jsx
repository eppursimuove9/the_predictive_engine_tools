import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link } from './shared/router.jsx';
import { useUnlock } from './shared/unlock.jsx';
import { CATEGORIES, toolsIn } from './registry.js';

const LOGO = 'https://media.beehiiv.com/cdn-cgi/image/format=auto,onerror=redirect/uploads/asset/file/412cff10-d6bf-4948-93cb-9626504d550b/Gemini_Generated_Image_hgi88jhgi88jhgi8-ezremove.png';
export const NEWSLETTER_URL = 'https://thepredictiveengine.beehiiv.com/';

// "Tools" menu: every category with its tools. Closes on outside click, Escape and navigation.
function ToolsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const close = () => setOpen(false);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true" className="flex items-center gap-1 text-sm font-semibold text-slate-200 hover:text-white px-2 py-2">
        Tools <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 sm:left-0 sm:right-auto mt-2 z-50 w-[min(92vw,860px)] max-h-[80vh] overflow-y-auto bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
            {CATEGORIES.map((c) => (
              <div key={c.slug}>
                <Link to={`/category/${c.slug}`} onClick={close} className="text-xs font-extrabold uppercase tracking-wider text-[#f52e01] hover:underline">{c.name}</Link>
                <ul className="mt-2 space-y-1">
                  {toolsIn(c.slug).map((t) => <li key={t.slug}><Link to={`/tools/${t.slug}`} onClick={close} className="text-sm text-slate-700 hover:text-slate-900 hover:underline">{t.title}</Link></li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100"><Link to="/" onClick={close} className="text-sm font-bold text-slate-700 hover:text-slate-900">See all tools</Link></div>
        </div>
      )}
    </div>
  );
}

export default function Layout({ title, children }) {
  const { isUnlocked, openUnlock } = useUnlock();
  useEffect(() => { document.title = title ? `${title} | The Predictive Engine` : 'GTM and RevOps Tools | The Predictive Engine'; }, [title]);
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-200 overflow-x-hidden flex flex-col">
      <header className="bg-[#0B1120] text-white px-4 sm:px-6 py-4 flex justify-between items-center shadow-md relative z-40">
        <Link to="/" className="flex items-center gap-3">
          <img src={LOGO} alt="The Predictive Engine logo" className="object-contain mix-blend-screen" style={{ width: 40, height: 40, flexShrink: 0 }} />
          <span className="font-bold tracking-wide text-lg hidden sm:inline-block">The Predictive Engine <span className="text-[#f52e01] font-light">Tools</span></span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <ToolsMenu />
          <button onClick={openUnlock} disabled={isUnlocked}
            className={`text-sm px-4 py-2 rounded-md border ${isUnlocked ? 'bg-[#f52e01] border-[#ff4117] text-white cursor-default' : 'bg-[#111A2E] hover:bg-[#1E2D4A] border-[#1E2D4A]'}`}>
            {isUnlocked ? 'Subscribed' : 'Subscribe free'}
          </button>
        </nav>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-8 space-y-8">{children}</main>
      <footer className="border-t border-slate-200 bg-white px-6 py-6 text-sm text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <span>Estimates to support a decision, based on the numbers you enter. Not guarantees.</span>
          <a href={NEWSLETTER_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-[#f52e01] hover:underline">Read The Predictive Engine newsletter</a>
        </div>
      </footer>
    </div>
  );
}
