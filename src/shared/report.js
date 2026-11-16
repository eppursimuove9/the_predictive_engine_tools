// PDF and Excel reports built from one spec:
//   { title, subtitle?, fileName, verdict?, sections: [{ sheet?, heading, head?, rows: [[cell, ...]], note? }] }
// A cell is a string, a number, or cell(value, kind) from format.js. Excel gets real numbers with real number formats.
import { KINDS, cell } from './format.js';

const isCell = (c) => c && typeof c === 'object' && 't' in c;
const text = (c) => (isCell(c) ? c.t : (typeof c === 'number' ? (Number.isFinite(c) ? c.toLocaleString('en-US', { maximumFractionDigits: 2 }) : 'N/A') : String(c ?? '')));
const isoDate = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------- PDF
export async function downloadPdf(report) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF();
  doc.setFontSize(18); doc.setTextColor(15, 23, 42);
  doc.text(report.title, 14, 20);
  doc.setFontSize(10); doc.setTextColor(100);
  doc.text(`${report.subtitle || 'Business case simulator'} | ${isoDate()}`, 14, 27);
  let y = 36;
  if (report.verdict) {
    doc.setFontSize(10); doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(`In plain words: ${report.verdict}`.replace(/[–—]/g, '-'), 182);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 6;
  }
  for (const sec of report.sections) {
    if (y > 255) { doc.addPage(); y = 20; }
    doc.setFontSize(11); doc.setTextColor(15, 23, 42);
    doc.text(sec.heading, 14, y);
    const head = sec.head || ['Item', 'Value'];
    const wide = head.length > 3;
    autoTable(doc, {
      startY: y + 3,
      head: [head],
      body: sec.rows.map((r) => r.map(text)),
      theme: 'striped',
      styles: { fontSize: wide ? 8 : 9, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: Object.fromEntries(head.slice(1).map((_, k) => [k + 1, { halign: wide ? 'left' : 'right' }])),
    });
    y = doc.lastAutoTable.finalY + (sec.note ? 4 : 10);
    if (sec.note) {
      doc.setFontSize(8); doc.setTextColor(100);
      const nl = doc.splitTextToSize(sec.note, 182);
      doc.text(nl, 14, y); y += nl.length * 4 + 8;
    }
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text('The Predictive Engine - GTM tools. Estimates based on the inputs you entered.', 14, 290);
    doc.text(`Page ${i} of ${pages}`, 196, 290, { align: 'right' });
  }
  doc.save(`${report.fileName}_${isoDate()}.pdf`);
}

// ---------------------------------------------------------------- Excel
const NAVY = 'FF0B1120'; const ACCENT = 'FFF52E01'; const INK = 'FF0F172A'; const MUTED = 'FF64748B';
const BAND = 'FFF8FAFC'; const LINE = 'FFE2E8F0'; const PANEL = 'FFFFF7ED';
const FONT = 'Calibri';

const SHEET_ORDER = ['Summary', 'Assumptions', 'Scenarios', 'Sensitivity', 'Benchmarks'];
function sheetOf(sec) {
  if (sec.sheet) return sec.sheet;
  const h = sec.heading || '';
  if (/^(key )?results/i.test(h)) return 'Summary';
  if (/assumption|input/i.test(h)) return 'Assumptions';
  if (/scenario/i.test(h)) return 'Scenarios';
  if (/sensitiv/i.test(h)) return 'Sensitivity';
  if (/benchmark/i.test(h)) return 'Benchmarks';
  return 'Data';
}
const colLetter = (n) => { let s = ''; for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s; return s; };

// Returns an ExcelJS workbook. `ExcelJS` is passed in so the browser can load it lazily and tests can use node.
export function buildWorkbook(ExcelJS, report) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'The Predictive Engine';
  wb.title = report.title;
  wb.created = new Date();

  // group sections by sheet, keeping the conventional order
  const groups = new Map();
  for (const sec of report.sections) {
    const n = sheetOf(sec);
    if (!groups.has(n)) groups.set(n, []);
    groups.get(n).push(sec);
  }
  if (!groups.has('Summary')) groups.set('Summary', []);
  const names = [...groups.keys()].sort((a, b) => {
    const ia = SHEET_ORDER.indexOf(a); const ib = SHEET_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  for (const name of names) {
    const secs = groups.get(name);
    const ws = wb.addWorksheet(name.slice(0, 31), { properties: { tabColor: { argb: name === 'Summary' ? ACCENT : NAVY } }, views: [{ showGridLines: false }] });
    const nCols = Math.max(2, ...secs.map((s) => (s.head ? s.head.length : (s.rows[0] ? s.rows[0].length : 2))));

    // ---- column widths from content
    const widths = Array(nCols).fill(12);
    const widen = (i, len, cap) => { widths[i] = Math.max(widths[i], Math.min(cap, len + 3)); };
    for (const s of secs) {
      (s.head || []).forEach((h, i) => widen(i, String(h).length, 28));
      for (const r of s.rows) r.forEach((c, i) => { if (i < nCols) widen(i, text(c).length, i === 0 ? 46 : (isCell(c) && c.k !== 'text' ? 22 : 44)); });
    }
    widths[0] = Math.max(widths[0], 30);
    if (name === 'Summary') for (let i = 0; i < nCols; i++) widths[i] = Math.max(widths[i], i === 0 ? 38 : 18);
    ws.columns = widths.map((w) => ({ width: w }));
    const totalW = widths.reduce((a, b) => a + b, 0);
    const lastCol = colLetter(nCols);
    const wrapHeight = (str, w) => Math.max(1, Math.ceil(String(str).length / Math.max(8, w * 1.05)));

    let r = 1;
    const title = ws.getRow(r); ws.mergeCells(`A${r}:${lastCol}${r}`);
    ws.getCell(`A${r}`).value = name === 'Summary' ? report.title : `${report.title}  |  ${name}`;
    ws.getCell(`A${r}`).font = { name: FONT, size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getCell(`A${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    ws.getCell(`A${r}`).alignment = { vertical: 'middle', indent: 1 };
    title.height = 32; r += 1;
    ws.mergeCells(`A${r}:${lastCol}${r}`);
    ws.getCell(`A${r}`).value = `${report.subtitle || 'Business case simulator'}  |  ${isoDate()}  |  All money in USD`;
    ws.getCell(`A${r}`).font = { name: FONT, size: 10, italic: true, color: { argb: MUTED } };
    ws.getCell(`A${r}`).alignment = { vertical: 'middle', indent: 1 };
    ws.getRow(r).height = 20; r += 2;
    const frozen = r - 1;

    if (name === 'Summary' && report.verdict) {
      ws.getCell(`A${r}`).value = 'IN PLAIN WORDS';
      ws.getCell(`A${r}`).font = { name: FONT, size: 9, bold: true, color: { argb: ACCENT } };
      r += 1;
      ws.mergeCells(`A${r}:${lastCol}${r}`);
      const c = ws.getCell(`A${r}`);
      c.value = report.verdict;
      c.font = { name: FONT, size: 11, color: { argb: INK } };
      c.alignment = { wrapText: true, vertical: 'top', indent: 1 };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PANEL } };
      c.border = { left: { style: 'thick', color: { argb: ACCENT } } };
      ws.getRow(r).height = Math.max(32, wrapHeight(report.verdict, totalW - 2) * 16 + 10);
      r += 2;
    }

    for (const s of secs) {
      ws.mergeCells(`A${r}:${lastCol}${r}`);
      const h = ws.getCell(`A${r}`);
      h.value = s.heading;
      h.font = { name: FONT, size: 12, bold: true, color: { argb: INK } };
      h.alignment = { vertical: 'middle' };
      for (let i = 1; i <= nCols; i++) ws.getCell(r, i).border = { bottom: { style: 'medium', color: { argb: ACCENT } } };
      ws.getRow(r).height = 22; r += 1;

      const head = s.head || ['Item', 'Value'];
      head.forEach((t, i) => {
        const c = ws.getCell(r, i + 1);
        c.value = t;
        c.font = { name: FONT, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
        c.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : (s.rows[0] && isCell(s.rows[0][i]) && s.rows[0][i].k !== 'text' ? 'right' : 'left'), wrapText: true, indent: i === 0 ? 1 : 0 };
      });
      ws.getRow(r).height = Math.max(22, Math.max(...head.map((t, i) => wrapHeight(t, widths[i]))) * 15 + 6);
      r += 1;

      s.rows.forEach((row, ri) => {
        let lines = 1;
        row.forEach((val, i) => {
          if (i >= nCols) return;
          const c = ws.getCell(r, i + 1);
          const K = isCell(val) ? KINDS[val.k] : null;
          if (isCell(val) && K && K.num && val.v !== null && Number.isFinite(val.v)) {
            c.value = val.v * (K.scale || 1);
            c.numFmt = K.xl;
            c.alignment = { horizontal: 'right', vertical: 'middle' };
          } else if (typeof val === 'number' && Number.isFinite(val)) {
            c.value = val;
            c.numFmt = Number.isInteger(val) ? '#,##0' : '#,##0.00';
            c.alignment = { horizontal: 'right', vertical: 'middle' };
          } else {
            const str = text(val);
            c.value = str;
            const na = isCell(val) && val.k === 'text' && val.v === null;
            c.alignment = { wrapText: true, vertical: 'middle', horizontal: na ? 'right' : 'left', indent: i === 0 ? 1 : 0 };
            lines = Math.max(lines, wrapHeight(str, widths[i]));
          }
          c.font = { name: FONT, size: 10, bold: i === 0 && head.length <= 2 ? false : false, color: { argb: INK } };
          c.border = { bottom: { style: 'thin', color: { argb: LINE } } };
          if (ri % 2 === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAND } };
        });
        ws.getRow(r).height = Math.max(19, lines * 14 + 5);
        r += 1;
      });
      if (s.note) {
        ws.mergeCells(`A${r}:${lastCol}${r}`);
        const c = ws.getCell(`A${r}`);
        c.value = s.note;
        c.font = { name: FONT, size: 9, italic: true, color: { argb: MUTED } };
        c.alignment = { wrapText: true, vertical: 'top', indent: 1 };
        ws.getRow(r).height = Math.max(16, wrapHeight(s.note, totalW) * 13 + 4);
        r += 1;
      }
      r += 1;
    }

    if (name === 'Summary') {
      ws.mergeCells(`A${r}:${lastCol}${r}`);
      const c = ws.getCell(`A${r}`);
      c.value = 'This file is a snapshot of the inputs entered in the calculator on the date above and the results they produce. Values are estimates to support a decision, not guarantees. Change the inputs in the tool and export again to update it.';
      c.font = { name: FONT, size: 9, italic: true, color: { argb: MUTED } };
      c.alignment = { wrapText: true, vertical: 'top', indent: 1 };
      ws.getRow(r).height = Math.max(28, wrapHeight(c.value, totalW) * 13 + 4);
    }

    ws.views = [{ showGridLines: false, state: 'frozen', ySplit: frozen }];
    ws.pageSetup = { orientation: totalW > 110 ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 1, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.7, header: 0.3, footer: 0.3 } };
    ws.headerFooter = { oddFooter: '&L&8The Predictive Engine&C&8&A&R&8Page &P of &N' };
  }
  return wb;
}

export async function downloadXlsx(report) {
  const { default: ExcelJS } = await import('exceljs');
  const wb = buildWorkbook(ExcelJS, report);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${report.fileName}_${isoDate()}.xlsx`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Ready-made sections shared by every tool.
export function sensSection(rows, label, kind = 'num1') {
  return {
    sheet: 'Sensitivity', heading: 'Sensitivity', head: [`Impact on ${label}`, 'If worse', 'If better'],
    rows: rows.map((r) => [r.label, cell(r.down, kind), cell(r.up, kind)]),
    note: 'Each input is moved by a fixed, illustrative margin, one at a time. The margins are not benchmarks. The longest impact is the input to check first.',
  };
}
const STRENGTH_TEXT = { survey: 'Survey or study', secondary: 'Secondary source', rule: 'Rule of thumb' };
export function benchSection(items, planning) {
  if (!items.length) {
    return { sheet: 'Benchmarks', heading: 'Benchmarks and sources', head: ['Topic', 'Note'], rows: [['No reliable public benchmark found', planning || 'Use your own data.']] };
  }
  const num = (v) => (v === null || v === undefined ? 'n/a' : String(Math.round(v * 100) / 100));
  return {
    sheet: 'Benchmarks', heading: 'Benchmarks and sources', head: ['Metric', 'Your value', 'Reference range', 'Source quality', 'Note', 'Source'],
    rows: items.map((b) => [b.label, `${num(b.value)} ${b.unit}`.trim(), b.refText || `${b.range[0]} to ${b.range[1]} ${b.unit}`, STRENGTH_TEXT[b.strength] || 'Rule of thumb', b.note, b.url ? `${b.source} (${b.url})` : b.source]),
    note: `Reference ranges come from public sources and are not a standard. The source quality column says how solid each one is.${planning ? ` ${planning}` : ''}`,
  };
}
