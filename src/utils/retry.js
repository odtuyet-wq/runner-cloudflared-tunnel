const { sleep } = require('./time');

/**
 * Retry utility for network and process operations
 */

/**
 * Retry an async operation with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {object} options - Retry options
 * @returns {Promise<any>} Result from successful operation
 */
async function retry(fn, options = {}) {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 2,
    onRetry = null
  } = options;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        break;
      }
      
      const waitTime = delay * Math.pow(backoff, attempt - 1);
      
      if (onRetry) {
        onRetry(error, attempt, waitTime);
      }
      
      await sleep(waitTime);
    }
  }
  
  throw lastError;
}

/**
 * Retry with custom condition
 * @param {Function} fn - Async function to retry
 * @param {Function} shouldRetry - Function to determine if should retry
 * @param {object} options - Retry options
 * @returns {Promise<any>}
 */
async function retryIf(fn, shouldRetry, options = {}) {
  const {
    maxAttempts = 3,
    delay = 1000,
    onRetry = null
  } = options;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!shouldRetry(error) || attempt === maxAttempts) {
        break;
      }
      
      if (onRetry) {
        onRetry(error, attempt);
      }
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}

module.exports = {
  retry,
  retryIf
};
