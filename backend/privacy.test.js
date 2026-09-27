import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeUserResponse, sanitizeStudentResponse, sanitizeTeacherResponse } from './src/utils/privacy.js';

test('password hashes are stripped from user payloads', () => {
  const data = {
    id: 1,
    email: 'admin@example.com',
    role: 'admin',
    password_hash: 'hashed-secret',
    refreshToken: 'secret-refresh',
  };

  const safe = sanitizeUserResponse(data, { actorRole: 'admin', actorId: 9, targetId: 1 });
  assert.equal(safe.password_hash, undefined);
  assert.equal(safe.refreshToken, undefined);
  assert.equal(safe.email, 'admin@example.com');
});

test('teacher salary fields are hidden for non-admins', () => {
  const data = {
    id: 10,
    name: 'Teacher A',
    baseSalary: 250000,
    bankName: 'HBL',
    accountNumber: '123456789',
    iban: 'PK123',
    phone: '+923001234567',
  };

  const safe = sanitizeTeacherResponse(data, { actorRole: 'teacher', actorId: 11, targetId: 10 });
  assert.equal(safe.baseSalary, undefined);
  assert.equal(safe.bankName, undefined);
  assert.equal(safe.accountNumber, undefined);
  assert.equal(safe.iban, undefined);
  assert.equal(safe.name, 'Teacher A');
});

test('student parent-contact fields are hidden from teachers', () => {
  const data = {
    id: 44,
    name: 'Student B',
    parentPhone: '+923003334444',
    parentName: 'Parent B',
    personal: { address: 'House 1', phone: '+923003334444' },
  };

  const safe = sanitizeStudentResponse(data, { actorRole: 'teacher', actorId: 5, targetId: 44, relatedParent: false });
  assert.equal(safe.parentPhone, undefined);
  assert.equal(safe.parentName, undefined);
  assert.equal(safe.personal, undefined);
  assert.equal(safe.name, 'Student B');
});
