import test from 'node:test';
import assert from 'node:assert/strict';
import { canManageRole, canDelegatePermission } from './src/middleware/auth.js';

test('admin can manage staff and end-user roles but not higher admin roles', () => {
  assert.equal(canManageRole('admin', 'teacher'), true);
  assert.equal(canManageRole('admin', 'student'), true);
  assert.equal(canManageRole('admin', 'admin'), false);
  assert.equal(canManageRole('admin', 'owner'), false);
});

test('delegation is limited to permissions the delegator already owns', async () => {
  assert.equal(await canDelegatePermission('finance_manager', 'finance.create'), true);
  assert.equal(await canDelegatePermission('finance_manager', 'settings.manage'), false);
  assert.equal(await canDelegatePermission('teacher', 'attendance.take'), true);
  assert.equal(await canDelegatePermission('teacher', 'students.manage'), false);
});
