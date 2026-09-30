import * as campusesApi from '../services/api/campuses.js';
import { escapeHtml } from './campusExportFormat.js';
export { downloadCsv, escapeHtml } from './campusExportFormat.js';

export const loadCampusForExport = async (campusId, fallback = null) => {
  const id = Number(campusId);
  if (!Number.isInteger(id) || id < 1) return fallback;
  try {
    return await campusesApi.getById(id);
  } catch {
    return fallback;
  }
};

export const openCampusPrintDocument = async ({ campusId, campus: fallbackCampus, title, documentId, content }) => {
  const campus = await loadCampusForExport(campusId, fallbackCampus);
  const campusName = campus?.name || 'Campus';
  const logo = campus?.logoUrl
    ? `<img class="logo" src="${escapeHtml(campus.logoUrl)}" alt="${escapeHtml(campusName)} logo"/>`
    : '<div class="logo-placeholder">SCHOOL</div>';
  const contact = [campus?.address, campus?.phone, campus?.email].filter(Boolean).map(escapeHtml).join(' · ');
  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)} · ${escapeHtml(campusName)}</title>
    <style>
      *{box-sizing:border-box}body{margin:0;padding:24px;background:#eef2f5;color:#17212b;font:13px/1.5 "Segoe UI",Arial,sans-serif}
      .sheet{max-width:920px;margin:auto;background:#fff;border:1px solid #dce3e8;border-radius:8px;overflow:hidden}
      .masthead{display:flex;align-items:center;gap:16px;padding:22px 26px;border-bottom:3px solid #176b70}
      .logo{width:68px;height:68px;object-fit:contain}.logo-placeholder{width:68px;height:68px;border:1px solid #dce3e8;display:grid;place-items:center;color:#61717d;font-size:10px}
      .campus{flex:1;min-width:0}.campus h1{font-size:20px;margin:0;color:#153b43}.campus-id,.contact{font-size:11px;color:#687782;margin-top:3px}
      .document{text-align:right}.document h2{font-size:19px;margin:0;color:#176b70}.document-id{font-size:11px;color:#687782;margin-top:5px;overflow-wrap:anywhere}
      .content{padding:24px 26px;min-height:300px}.content table{width:100%;border-collapse:collapse}.content th,.content td{padding:9px 10px;text-align:left;border-bottom:1px solid #e2e8eb}.content th{background:#f1f6f6;color:#42535d;font-size:10px;text-transform:uppercase}.content tr:nth-child(even) td{background:#fafcfc}
      .footer{border-top:1px solid #e2e8eb;padding:11px 26px;display:flex;justify-content:space-between;gap:12px;color:#74818a;font-size:10px}.developer{font-size:9px;color:#89949b;text-align:right}
      @media print{body{padding:0;background:#fff}.sheet{max-width:none;border:0;border-radius:0}.content{min-height:0}.footer{position:fixed;bottom:0;left:0;right:0;background:#fff}.content{padding-bottom:36px}}
    </style></head><body><main class="sheet"><header class="masthead">${logo}<div class="campus"><h1>${escapeHtml(campusName)}</h1><div class="campus-id">Campus ID: ${escapeHtml(campus?.id ?? campusId ?? '—')}</div><div class="contact">${contact || ' '}</div></div><div class="document"><h2>${escapeHtml(title)}</h2><div class="document-id">${documentId ? `Document ID: ${escapeHtml(documentId)}` : ''}</div></div></header><section class="content">${content}</section><footer class="footer"><span>Printed ${escapeHtml(new Date().toLocaleString())}</span><span class="developer">Developed by J-Studio · www.jstudio.tech · 0307-7763195</span></footer></main><script>window.onload=()=>{const imgs=[...document.images];Promise.all(imgs.map(i=>i.complete?Promise.resolve():new Promise(r=>{i.onload=r;i.onerror=r}))).then(()=>window.print())};</script></body></html>`;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
};