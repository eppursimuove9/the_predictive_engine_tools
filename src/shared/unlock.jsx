// Shared "subscribe to unlock" state and modal. One email unlocks every tool on the site.
import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Lock, Rocket } from 'lucide-react';

const KEY = 'tpe_pro_unlocked';
const UnlockContext = createContext({ isUnlocked: false, openUnlock: () => {} });
export const useUnlock = () => useContext(UnlockContext);

export function UnlockProvider({ children }) {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  });
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const openUnlock = useCallback(() => { if (!isUnlocked) setOpen(true); }, [isUnlocked]);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    let ok = false;
    try {
      const res = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }) });
      if (res.status === 400) { setError('Please enter a valid email address.'); setBusy(false); return; }
      ok = res.ok;
    } catch (err) { console.error('Subscribe error:', err); }
    // Local development only. In production builds, access requires a confirmed subscription.
    if (!ok && import.meta.env.DEV) ok = true;
    if (!ok) { setError("We couldn't complete your subscription. Please try again in a moment."); setBusy(false); return; }
    try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
    setIsUnlocked(true); setOpen(false); setBusy(false);
  };

  const value = useMemo(() => ({ isUnlocked, openUnlock }), [isUnlocked, openUnlock]);
  return (
    <UnlockContext.Provider value={value}>
      {children}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1120]/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Unlock the full analysis">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-6"><Rocket className="w-6 h-6 text-[#f52e01]" /></div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Unlock the full analysis</h3>
            <p className="text-slate-600 mb-6">Subscribe free to unlock scenarios and sensitivity, benchmarks, and PDF and Excel reports in every tool.</p>
            <form onSubmit={submit} className="space-y-4">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@yourcompany.com" className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#f52e01] outline-none" />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={busy} className="w-full bg-[#f52e01] hover:bg-[#ff4117] disabled:opacity-60 text-white font-bold py-3 rounded-lg shadow-md transition-colors">{busy ? 'Unlocking...' : 'Subscribe & Unlock Free'}</button>
            </form>
            <p className="mt-4 text-xs text-slate-600 leading-snug">By continuing you join The Predictive Engine newsletter. You can unsubscribe at any time from any email.</p>
            <div className="mt-6 flex justify-between items-center text-xs text-slate-600">
              <span><Lock className="w-3 h-3 inline" /> 100% Secure.</span>
              <button onClick={() => setOpen(false)} className="hover:text-slate-800 font-bold">Close</button>
            </div>
          </div>
        </div>
      )}
    </UnlockContext.Provider>
  );
}
