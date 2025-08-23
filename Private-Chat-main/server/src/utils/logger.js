'use strict';

function createServerLogger() {
  return {
    info: (obj, msg) => console.log('[INFO]', msg || '', obj || {}),
    warn: (obj, msg) => console.warn('[WARN]', msg || '', obj || {}),
    error: (obj, msg) => console.error('[ERROR]', msg || '', obj || {}),
  };
}

module.exports = { createServerLogger };




