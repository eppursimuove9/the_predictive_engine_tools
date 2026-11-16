// State for a tool: one inputs object, share links, examples and reset.
import { useState, useCallback, useEffect } from 'react';
import { clamp } from './format.js';

// limits: { key: [min, max] } for numbers, { key: ['a','b'] } is treated as an enum when values are strings.
export function sanitize(raw, defaults, limits) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const k of Object.keys(defaults)) {
    if (!(k in raw)) continue;
    const lim = limits[k];
    if (typeof defaults[k] === 'string') { if (lim && lim.includes(raw[k])) out[k] = raw[k]; continue; }
    const n = Number(raw[k]);
    if (!Number.isFinite(n)) continue;
    out[k] = lim ? clamp(n, lim[0], lim[1]) : n;
  }
  return out;
}

export function useToolState({ defaults, limits, presets }) {
  const [inputs, setInputs] = useState(defaults);
  const set = useCallback((key, value) => setInputs((p) => ({ ...p, [key]: value })), []);
  const setter = useCallback((key) => (value) => setInputs((p) => ({ ...p, [key]: value })), []);

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('s');
      if (q) setInputs((p) => ({ ...p, ...sanitize(JSON.parse(atob(q)), defaults, limits) }));
    } catch { /* ignore malformed links */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const same = (base) => Object.keys(defaults).every((k) => inputs[k] === base[k]);
  const bases = [defaults, ...presets.map((p) => ({ ...defaults, ...p.inputs }))];
  const isKnownState = () => bases.some(same);
  const activePresetId = (presets.find((p) => same({ ...defaults, ...p.inputs })) || {}).id || null;

  const clearUrl = () => { try { window.history.replaceState({}, '', window.location.pathname); } catch { /* ignore */ } };
  const reset = () => {
    if (!isKnownState() && !window.confirm('Start a new simulation? Your current inputs will be reset to the starting values.')) return;
    setInputs(defaults); clearUrl();
  };
  const loadPreset = (p) => {
    if (!isKnownState() && !window.confirm('Load this example? Your current inputs will be replaced.')) return;
    setInputs({ ...defaults, ...p.inputs }); clearUrl();
  };
  const copyShareLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?s=${encodeURIComponent(btoa(JSON.stringify(inputs)))}`;
    try { await navigator.clipboard.writeText(url); return true; } catch { window.prompt('Copy this link', url); return false; }
  };
  return { inputs, set, setter, reset, loadPreset, activePresetId, copyShareLink };
}
