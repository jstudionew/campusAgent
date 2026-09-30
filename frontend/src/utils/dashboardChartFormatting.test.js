import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDashboardDate, shouldShowDashboardTick } from './dashboardChartFormatting.js';

test('monthly labels include years so annual trends stay unique', () => {
  assert.match(formatDashboardDate('2025-09', '1y'), /^Sept? '25$/);
  assert.match(formatDashboardDate('2026-09', '1y'), /^Sept? '26$/);
});

test('daily ranges use compact labels and retain full dates for tooltips', () => {
  assert.equal(formatDashboardDate('2026-09-30', '1m'), '30');
  assert.match(formatDashboardDate('2026-10-01', '1m'), /^(Oct 1|1 Oct)$/);
  assert.match(formatDashboardDate('2026-09-30', '1m', true), /30 Sept? 2026|Sept? 30, 2026/);
  assert.equal(formatDashboardDate('2026-09-30', '7d'), 'Wed');
});

test('dense charts display no more than eight date ticks and keep endpoints', () => {
  const visible = Array.from({ length: 31 }, (_, index) => shouldShowDashboardTick(index, 31));
  assert.ok(visible.filter(Boolean).length <= 8);
  assert.equal(visible[0], true);
  assert.equal(visible.at(-1), true);
});