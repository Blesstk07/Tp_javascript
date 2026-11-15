const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/config/db');
const { runTransaction } = require('../src/services/transactions');

test('transaction retries a deadlock after rollback and releases each connection', async (t) => {
  const originalGetConnection = pool.getConnection;
  t.after(() => { pool.getConnection = originalGetConnection; });

  const events = [];
  let connectionNumber = 0;
  pool.getConnection = async () => {
    const number = ++connectionNumber;
    return {
      beginTransaction: async () => events.push(`begin:${number}`),
      commit: async () => events.push(`commit:${number}`),
      rollback: async () => events.push(`rollback:${number}`),
      release: () => events.push(`release:${number}`),
    };
  };

  let workCount = 0;
  const result = await runTransaction(async () => {
    workCount += 1;
    if (workCount === 1) {
      const error = new Error('deadlock');
      error.code = 'ER_LOCK_DEADLOCK';
      throw error;
    }
    return 'committed';
  });

  assert.equal(result, 'committed');
  assert.equal(workCount, 2);
  assert.deepEqual(events, [
    'begin:1', 'rollback:1', 'release:1',
    'begin:2', 'commit:2', 'release:2',
  ]);
});

test('transaction does not retry application errors', async (t) => {
  const originalGetConnection = pool.getConnection;
  t.after(() => { pool.getConnection = originalGetConnection; });

  let connectionCount = 0;
  let rollbackCount = 0;
  pool.getConnection = async () => {
    connectionCount += 1;
    return {
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => { rollbackCount += 1; },
      release: () => {},
    };
  };

  await assert.rejects(runTransaction(async () => {
    throw new Error('application failure');
  }), /application failure/);
  assert.equal(connectionCount, 1);
  assert.equal(rollbackCount, 1);
});
