export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

export const downloadCsv = ({ filename, headers, rows }) => {
  const protect = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    const safe = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const csvHeaders = [...headers, 'Developed By', 'Developer Website', 'Developer Contact'];
  const csvRows = rows.map((row) => [...row, 'J-Studio', 'www.jstudio.tech', '0307-7763195']);
  const csv = [csvHeaders, ...csvRows].map((row) => row.map(protect).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
