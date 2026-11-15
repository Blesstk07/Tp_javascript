const test = require('node:test');
const assert = require('node:assert/strict');
const {
  addMoney,
  multiplyMoney,
  normalizeMoney,
  parsePagination,
} = require('../src/services/helpers');

test('pagination accepts valid bounds and rejects malformed or unknown parameters', () => {
  assert.deepEqual(parsePagination({ page: '2', limit: '100' }), {
    page: 2,
    limit: 100,
    offset: 100,
  });
  assert.throws(() => parsePagination({ page: '1x' }), { status: 400, code: 'VALIDATION_ERROR' });
  assert.throws(() => parsePagination({ limit: '101' }), { status: 400, code: 'VALIDATION_ERROR' });
  assert.throws(() => parsePagination({ surprise: 'true' }), { status: 400, code: 'VALIDATION_ERROR' });
});

test('money normalization and totals use exact cents', () => {
  assert.equal(normalizeMoney('1.2'), '1.20');
  assert.equal(addMoney('0.10', '0.20'), '0.30');
  assert.equal(multiplyMoney('0.10', 3), '0.30');
  assert.throws(() => normalizeMoney('-1.00'), { status: 400, code: 'VALIDATION_ERROR' });
  assert.throws(() => normalizeMoney('1.001'), { status: 400, code: 'VALIDATION_ERROR' });
});
