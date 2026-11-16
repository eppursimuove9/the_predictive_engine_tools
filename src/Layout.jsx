import { useEffect } from 'react';
import { Link } from './shared/router.jsx';
import { useUnlock } from './shared/unlock.jsx';

const LOGO = 'https://media.beehiiv.com/cdn-cgi/image/format=auto,onerror=redirect/uploads/asset/file/412cff10-d6bf-4948-93cb-9626504d550b/Gemini_Generated_Image_hgi88jhgi88jhgi8-ezremove.png';
export const NEWSLETTER_URL = 'https://thepredictiveengine.beehiiv.com/';

export default function Layout({ title, children }) {
  const { isUnlocked, openUnlock } = useUnlock();
  useEffect(() => { document.title = title ? `${title} | The Predictive Engine` : 'GTM and RevOps Tools | The Predictive Engine'; }, [title]);
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-200 overflow-x-hidden flex flex-col">
      <header className="bg-[#0B1120] text-white px-6 py-4 flex justify-between items-center shadow-md">
        <Link to="/" className="flex items-center gap-3">
          <img src={LOGO} alt="The Predictive Engine logo" className="object-contain mix-blend-screen" style={{ width: 40, height: 40, flexShrink: 0 }} />
          <span className="font-bold tracking-wide text-lg hidden sm:inline-block">The Predictive Engine <span className="text-[#f52e01] font-light">Tools</span></span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link to="/" className="text-sm font-semibold text-slate-200 hover:text-white px-2 py-2">All tools</Link>
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
