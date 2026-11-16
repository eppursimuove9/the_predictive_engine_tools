// Turns a declarative tool config (see src/tools/*.config.js) into a full calculator page.
// Every config-driven tool gets the same pattern: examples, verdict, four KPIs, a chart, then email-locked scenarios,
// sensitivity, benchmarks, PDF and Excel.
import { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Target, BookOpen } from 'lucide-react';
import { ControlSlider, ToolHeader, PresetBar, StartingValuesNote, VerdictCard, KpiGrid, ToolLayout, ControlGroup, AdvancedGroup, Card, CollapsibleSection, ScenarioTable, TornadoChart, BenchmarkList, ExportPanel, HowToRead } from './ui.jsx';
import { fmtMoney, fmtKind, signedMoney } from './format.js';
import { useToolState } from './toolstate.js';
import { useUnlock } from './unlock.jsx';
import { tornado } from './sensitivity.js';
import { downloadPdf, downloadXlsx } from './report.js';
import { buildToolReport } from './toolReport.js';

const COLORS = ['#f52e01', '#0B1120', '#10b981', '#6366f1'];

const axisFmt = (kind) => (v) => (kind === 'money' ? fmtMoney(v) : (kind === 'pp' ? `${Math.round(v * 10) / 10}%` : (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : `${Math.round(v * 100) / 100}`)));
const torFmt = (kind) => (v) => {
  if (kind === 'money') return signedMoney(v);
  const sign = v > 0 ? '+' : '';
  if (kind === 'x') return `${sign}${v.toFixed(1)}x`;
  if (kind === 'pp') return `${sign}${v.toFixed(1)} pts`;
  if (kind === 'months') return `${sign}${v.toFixed(1)} mo`;
  return `${sign}${Math.abs(v) >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(1)}`;
};

export function makeTool(cfg) {
  const { defaults, limits, presets } = cfg;

  function Tool() {
    const { inputs, setter, reset, loadPreset, activePresetId, copyShareLink } = useToolState({ defaults, limits, presets });
    const { isUnlocked, openUnlock } = useUnlock();
    const m = useMemo(() => cfg.model(inputs), [inputs]);
    const verdict = cfg.verdictFor(inputs, m);
    const scen = useMemo(() => cfg.scenarios.map((s) => ({ label: s.label, m: cfg.model(s.apply(inputs)) })), [inputs]);
    const sm = cfg.sensMetric;
    const tor = useMemo(() => tornado(inputs, cfg.sens, (x) => sm.fn(cfg.model(x)), { higherIsBetter: sm.higherIsBetter !== false }), [inputs, sm]);
    const bench = cfg.bench ? cfg.bench(inputs, m) : [];
    const chartRows = useMemo(() => cfg.chart.data(inputs, m), [inputs, m]);
    const ch = cfg.chart;
    const ref = ch.ref ? ch.ref(inputs, m) : null;

    const report = () => buildToolReport(cfg, inputs);

    const render = (f) => (
      <ControlSlider key={f.key} label={f.label} value={inputs[f.key]} min={f.min ?? limits[f.key][0]} max={f.max ?? limits[f.key][1]} step={f.step || 1} setter={setter(f.key)} prefix={f.prefix || ''} suffix={f.suffix || ''} tooltip={f.tooltip} />
    );
    const controls = (
      <>
        <StartingValuesNote />
        <PresetBar presets={presets} activeId={activePresetId} onLoad={loadPreset} onReset={reset} />
        {cfg.groups.map((g) => {
          const main = g.fields.filter((f) => !f.advanced);
          const adv = g.fields.filter((f) => f.advanced);
          return (
            <ControlGroup key={g.title} title={<><TrendingUp className="w-5 h-5 text-slate-500" /> {g.title}</>}>
              {main.map(render)}
              {adv.length > 0 && <AdvancedGroup summary={g.advancedSummary ? g.advancedSummary(inputs) : undefined}>{adv.map(render)}</AdvancedGroup>}
            </ControlGroup>
          );
        })}
      </>
    );

    const yFmt = axisFmt(ch.yKind || 'money');
    const common = { data: chartRows, margin: { top: 16, right: 24, left: 8, bottom: 8 } };
    const axes = (
      <>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={ch.x} tickFormatter={ch.xFormat} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
        <YAxis tickFormatter={yFmt} axisLine={false} tickLine={false} width={72} tick={{ fill: '#64748b', fontSize: 12 }} />
        <RechartsTooltip labelFormatter={ch.xFormat ? (v) => ch.xFormat(v) : undefined} formatter={(v, n) => [fmtKind(ch.yKind || 'money', v), n]} />
        {ch.series.length > 1 && <Legend />}
        {ref && <ReferenceLine y={ref.y} stroke="#0B1120" strokeWidth={2} strokeDasharray="5 4" label={{ position: 'insideTopRight', value: ref.label, fill: '#0B1120', fontWeight: 700, fontSize: 12 }} />}
      </>
    );
    const chartEl = ch.type === 'bar'
      ? <BarChart {...common}>{axes}{ch.series.map((s, k) => <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color || COLORS[k % 4]} radius={[4, 4, 0, 0]} stackId={ch.stacked ? 'a' : undefined} />)}</BarChart>
      : (ch.type === 'area'
        ? <AreaChart {...common}>{axes}{ch.series.map((s, k) => <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color || COLORS[k % 4]} fill={s.color || COLORS[k % 4]} fillOpacity={0.15} strokeWidth={3} stackId={ch.stacked ? 'a' : undefined} />)}</AreaChart>
        : <LineChart {...common}>{axes}{ch.series.map((s, k) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color || COLORS[k % 4]} strokeWidth={3} dot={false} />)}</LineChart>);

    const insights = cfg.insights ? cfg.insights(inputs, m) : null;
    const results = (
      <>
        <VerdictCard verdict={verdict} />
        <KpiGrid items={cfg.kpis(inputs, m)} />
        <Card title={ch.title} icon={<TrendingUp className="w-5 h-5 text-slate-700" />} note={ch.note}>
          <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%">{chartEl}</ResponsiveContainer></div>
          {ch.caption && <p className="mt-3 text-sm text-slate-700">{ch.caption(inputs, m)}</p>}
        </Card>

        <CollapsibleSection title="Scenarios and sensitivity" icon={<Target className="w-5 h-5 text-slate-700" />} locked={!isUnlocked} onUnlock={openUnlock}>
          <div className="space-y-6">
            {insights && insights.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-900">{cfg.insightsTitle || 'What it would take'}</h4>
                <ul className="mt-2 text-sm text-slate-700 space-y-1 list-disc pl-5">{insights.map((t, k) => <li key={k}>{t}</li>)}</ul>
              </div>
            )}
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Scenarios</h4>
              <p className="text-sm text-slate-600 mb-3">{cfg.scenarioNote}</p>
              <ScenarioTable columns={scen.map((s) => s.label)} rows={cfg.results.filter((r) => r.scenario).map((r) => ({ label: r.label, values: scen.map((s) => fmtKind(r.kind, r.get(s.m, inputs))) }))} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">What moves the result the most</h4>
              <p className="text-sm text-slate-600 mb-2">Impact on {sm.label}. Each bar shows how it changes when that input moves by a fixed, illustrative margin. The margins are not benchmarks. Check the longest bars first.</p>
              <TornadoChart rows={tor} format={torFmt(sm.kind || 'num1')} />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Benchmarks and sources" icon={<BookOpen className="w-5 h-5 text-slate-500" />} locked={!isUnlocked} onUnlock={openUnlock}>
          <BenchmarkList items={bench} planning={cfg.planning} />
        </CollapsibleSection>

        <ExportPanel isUnlocked={isUnlocked} onUnlock={openUnlock} onPdf={() => downloadPdf(report())} onXlsx={() => downloadXlsx(report())} onShare={copyShareLink} />
        <HowToRead items={cfg.how} />
      </>
    );

    return (
      <div className="space-y-8">
        <ToolHeader eyebrow={cfg.eyebrow} title={cfg.titleLead} accent={cfg.titleAccent} blurb={cfg.blurb} />
        <ToolLayout controls={controls} results={results} />
      </div>
    );
  }
  Tool.displayName = `Tool(${cfg.slug})`;
  return Tool;
}
