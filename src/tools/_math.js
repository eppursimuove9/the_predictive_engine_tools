// Small shared math helpers for the config-driven tools. Pure functions, no React.
export const ok = (n) => typeof n === 'number' && Number.isFinite(n);
export const div = (a, b) => (ok(a) && ok(b) && b !== 0 ? a / b : null);
export const trio = (pess, opt) => [
  { label: 'Pessimistic', apply: pess },
  { label: 'Base case', apply: (i) => i },
  { label: 'Optimistic', apply: opt },
];
// Net present value. flows[0] happens today (t = 0).
export const npv = (rate, flows) => flows.reduce((s, f, t) => s + f / (1 + rate) ** t, 0);
// Internal rate of return by bisection. Returns null when there is no sign change (no meaningful IRR).
export function irr(flows) {
  const f = (r) => npv(r, flows);
  let lo = -0.99; let hi = 10;
  if (!(f(lo) * f(hi) < 0)) return null;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}
// Inverse of the standard normal CDF (Acklam's algorithm, relative error about 1e-9).
export function invNorm(p) {
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pl = 0.02425; const ph = 1 - pl;
  let q; let r;
  if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p <= ph) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}
