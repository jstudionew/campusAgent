import assert from 'node:assert/strict';
import test from 'node:test';
import { makeCustomRoleKey } from './src/services/rbac.service.js';

test('custom role keys are namespaced and normalized', () => {
  assert.equal(makeCustomRoleKey('Librarian'), 'custom_librarian');
  assert.equal(makeCustomRoleKey('Finance Manager'), 'custom_finance_manager');
  assert.equal(makeCustomRoleKey('  Library / Assistant  '), 'custom_library_assistant');
});

test('custom role key generation rejects names with no usable characters', () => {
  assert.equal(makeCustomRoleKey('---'), '');
});