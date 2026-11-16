// Builds the PDF/Excel report of a config-driven tool. Pure (no React), so it can be tested on its own.
import { cell } from './format.js';
import { tornado } from './sensitivity.js';
import { sensSection, benchSection } from './report.js';

export const fieldKind = (f) => f.kind || (f.prefix === '$' ? 'money' : (f.suffix && f.suffix.includes('%') ? 'pp' : (f.step && f.step < 1 ? 'num1' : 'int')));

export function buildToolReport(cfg, inputs) {
  const m = cfg.model(inputs);
  const verdict = cfg.verdictFor(inputs, m);
  const scen = cfg.scenarios.map((s) => ({ label: s.label, m: cfg.model(s.apply(inputs)) }));
  const sm = cfg.sensMetric;
  const tor = tornado(inputs, cfg.sens, (x) => sm.fn(cfg.model(x)), { higherIsBetter: sm.higherIsBetter !== false });
  const bench = cfg.bench ? cfg.bench(inputs, m) : [];
  const ch = cfg.chart;
  const rows = ch.data(inputs, m);
  const fields = cfg.groups.flatMap((g) => g.fields);
  return {
    title: cfg.title, subtitle: cfg.eyebrow, fileName: cfg.fileName, verdict: `${verdict.headline} ${verdict.detail || ''}`.trim(),
    sections: [
      { sheet: 'Summary', heading: 'Key results', rows: cfg.results.map((r) => [r.label, cell(r.get(m, inputs), r.kind)]) },
      { sheet: 'Assumptions', heading: 'Assumptions', rows: fields.map((f) => [f.label, cell(inputs[f.key], fieldKind(f))]) },
      { sheet: 'Scenarios', heading: 'Scenarios', head: ['Result', ...scen.map((s) => s.label)], rows: cfg.results.filter((r) => r.scenario).map((r) => [r.label, ...scen.map((s) => cell(r.get(s.m, inputs), r.kind))]), note: cfg.scenarioNote },
      sensSection(tor, sm.label, sm.kind || 'num1'),
      benchSection(bench, cfg.planning),
      { sheet: 'Data', heading: ch.title, head: [ch.xTitle || 'Period', ...ch.series.map((s) => s.name)], rows: rows.map((row) => [cell(row[ch.x], ch.xKind || 'int'), ...ch.series.map((s) => cell(row[s.key], ch.yKind || 'money'))]) },
    ],
  };
}
