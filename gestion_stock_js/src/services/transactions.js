const pool = require('../config/db');

function isRetryableTransactionError(error) {
  return error && (
    error.code === 'ER_LOCK_DEADLOCK'
    || error.code === 'ER_LOCK_WAIT_TIMEOUT'
    || error.errno === 1213
    || error.errno === 1205
  );
}

async function runTransaction(work) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const connection = await pool.getConnection();
    let transactionStarted = false;
    let commitStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const result = await work(connection);
      commitStarted = true;
      await connection.commit();
      return result;
    } catch (error) {
      if (transactionStarted) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error('Échec du rollback après une erreur de transaction', rollbackError);
        }
      }

      if (!commitStarted && attempt < 3 && isRetryableTransactionError(error)) {
        continue;
      }
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = { runTransaction };
