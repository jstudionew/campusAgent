import assert from 'node:assert/strict';
import test from 'node:test';
import { toDateInputValue } from './dateValues.js';
import { syncTeacherClassSections } from './teacherClassSections.js';

test('date input values use validated ISO calendar dates', () => {
  assert.equal(toDateInputValue('2016-02-06T00:00:00.000Z'), '2016-02-06');
  assert.equal(toDateInputValue('02/06/2016'), '2016-02-06');
  assert.equal(toDateInputValue('2016-02-30'), '');
  assert.equal(toDateInputValue('02/06/201666'), '');
});

test('class synchronization skips existing and duplicate labels in the selected campus', async () => {
  const created = [];
  const calls = [];
  const classesApi = {
    list: async (...args) => {
      calls.push(['list', ...args]);
      return { rows: [{ className: '10', section: 'A' }] };
    },
    create: async (...args) => {
      calls.push(['create', ...args]);
      created.push(args[0]);
      return args[0];
    },
  };

  await syncTeacherClassSections({
    labels: ['10A', '11B', '11B'],
    campusId: 9,
    classesApi,
  });

  assert.deepEqual(created, [{ className: '11', section: 'B', academicYear: '', campusId: 9 }]);
  assert.deepEqual(calls[0][2], { headers: { 'x-campus-id': '9' } });
  assert.equal(calls.length, 2);
});

test('class synchronization splits named academic levels with a trailing section', async () => {
  let created;
  const classesApi = {
    list: async () => ({ rows: [] }),
    create: async (payload) => { created = payload; return payload; },
  };

  await syncTeacherClassSections({ labels: ['DAE CIT 3rd YearA'], campusId: 9, classesApi });

  assert.deepEqual(created, {
    className: 'DAE CIT 3rd Year',
    section: 'A',
    academicYear: '',
    campusId: 9,
  });
});

test('malformed class labels do not create partial class records', async () => {
  let createCalls = 0;
  const classesApi = {
    list: async () => ({ rows: [] }),
    create: async () => { createCalls += 1; },
  };

  await assert.rejects(
    syncTeacherClassSections({ labels: ['Science'], campusId: 9, classesApi }),
    /must include a section/
  );
  assert.equal(createCalls, 0);
});