// Generic PDF and Excel reports. A report is:
// { title, subtitle, fileName, verdict, sections: [{ heading, head?: [..], rows: [[cell, ...], ...] }] }
// A cell is a string/number, or { t: 'display text', v: rawValue } (see cell() in format.js).
const text = (c) => (c && typeof c === 'object' && 't' in c ? c.t : String(c ?? ''));
const raw = (c) => (c && typeof c === 'object' && 'v' in c ? c.v : c);
const stamp = () => new Date().toLocaleDateString();

export async function downloadPdf(report) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF();
  doc.setFontSize(18); doc.setTextColor(15, 23, 42);
  doc.text(report.title, 14, 20);
  doc.setFontSize(10); doc.setTextColor(100);
  doc.text(`${report.subtitle || 'Business case simulator'} | ${stamp()}`, 14, 27);
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
    autoTable(doc, {
      startY: y + 3,
      head: [head],
      body: sec.rows.map((r) => r.map(text)),
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: Object.fromEntries(head.slice(1).map((_, k) => [k + 1, { halign: 'right' }])),
    });
    y = doc.lastAutoTable.finalY + 10;
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text('The Predictive Engine - GTM tools. Estimates based on the inputs you entered.', 14, 290);
    doc.text(`Page ${i} of ${pages}`, 196, 290, { align: 'right' });
  }
  doc.save(`${report.fileName}_${stamp().replace(/\//g, '-')}.pdf`);
}

export async function downloadXlsx(report) {
  const XLSX = await import('xlsx');
  const aoa = [[report.title], [`${report.subtitle || 'Business case simulator'} | ${stamp()}`], []];
  if (report.verdict) aoa.push(['In plain words', report.verdict], []);
  for (const sec of report.sections) {
    aoa.push([sec.heading]);
    if (sec.head) aoa.push(sec.head.slice(0));
    for (const r of sec.rows) aoa.push(r.map(raw));
    aoa.push([]);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 44 }, ...Array(8).fill({ wch: 18 })];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `${report.fileName}_${stamp().replace(/\//g, '-')}.xlsx`);
}
