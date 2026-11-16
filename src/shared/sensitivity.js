// Generic tornado: how much does a result move when each input is pushed worse or better?
// vars: [{ label, worse: (inputs) => inputs, better: (inputs) => inputs }]
// metric: (inputs) => number. Rows are expressed as "impact" (positive = good for the user).
export function tornado(base, vars, metric, { higherIsBetter = true } = {}) {
  const m0 = metric(base);
  const sign = higherIsBetter ? 1 : -1;
  return vars
    .map((v) => {
      const w = (metric(v.worse(base)) - m0) * sign;
      const b = (metric(v.better(base)) - m0) * sign;
      const down = Math.min(0, w, b);
      const up = Math.max(0, w, b);
      return { label: v.label, down, up, span: up - down };
    })
    .filter((r) => Number.isFinite(r.span) && r.span > 1e-9)
    .sort((a, b) => b.span - a.span)
    .slice(0, 8);
}
