import assert from 'node:assert/strict';
import test from 'node:test';
import { downloadCsv, escapeHtml } from './campusExportFormat.js';

test('print values are escaped before insertion into the branded document', () => {
  assert.equal(escapeHtml('<Campus & "School">'), '&lt;Campus &amp; &quot;School&quot;&gt;');
});

test('CSV export quotes values, neutralizes spreadsheet formulas, and adds developer metadata', async () => {
  const originalDocument = globalThis.document;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  let csvBlob;
  globalThis.document = { createElement: () => ({ click() {} }) };
  URL.createObjectURL = (blob) => { csvBlob = blob; return 'blob:test'; };
  URL.revokeObjectURL = () => {};

  try {
    downloadCsv({ filename: 'test.csv', headers: ['Campus', 'Name'], rows: [[4, '=2+2'], [5, 'Smith, Jr.']] });
    const contents = await csvBlob.text();
    assert.match(contents, /"Campus","Name","Developed By","Developer Website","Developer Contact"/);
    assert.match(contents, /"4","'=2\+2","J-Studio","www\.jstudio\.tech","0307-7763195"/);
    assert.match(contents, /"Smith, Jr\."/);
  } finally {
    globalThis.document = originalDocument;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  }
});