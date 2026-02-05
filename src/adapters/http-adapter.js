const { retry } = require('../utils/retry');
const { NetworkError, CloudflareApiError } = require('../utils/errors');
const { maskTokensInContent } = require('../utils/logger');

const DEFAULT_TIMEOUT = 30000;

async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new NetworkError(`Request timeout after ${timeout}ms: ${url}`);
    }
    throw error;
  }
}

async function cloudflareRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body = null,
    apiKey,
    email,
    accountId,
    timeout = DEFAULT_TIMEOUT,
    retryOptions = {},
    logger = null
  } = options;
  
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `https://api.cloudflare.com/client/v4${endpoint}`;
  
  const requestHeaders = {
    'Content-Type': 'application/json',
    'X-Auth-Email': email,
    'X-Auth-Key': apiKey,
    ...headers
  };
  
  const requestOptions = {
    method,
    headers: requestHeaders
  };
  
  if (body) {
    requestOptions.body = JSON.stringify(body);
  }
  
  try {
    const response = await retry(
      () => fetchWithTimeout(url, requestOptions, timeout),
      {
        maxAttempts: 3,
        delay: 2000,
        ...retryOptions,
        onRetry: (error, attempt, waitTime) => {
          if (logger) {
            logger.warn(`API request failed (attempt ${attempt}), retrying in ${waitTime}ms...`);
          }
        }
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new CloudflareApiError(
        data.errors?.[0]?.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        data
      );
    }
    
    if (!data.success) {
      throw new CloudflareApiError(
        data.errors?.[0]?.message || 'API request failed',
        response.status,
        data
      );
    }
    
    return data;
  } catch (error) {
    if (error instanceof CloudflareApiError) {
      throw error;
    }
    throw new NetworkError(`Failed to make API request to ${url}: ${error.message}`, error);
  }
}

async function get(endpoint, options = {}) {
  return cloudflareRequest(endpoint, { ...options, method: 'GET' });
}

async function post(endpoint, body, options = {}) {
  return cloudflareRequest(endpoint, { ...options, method: 'POST', body });
}

async function put(endpoint, body, options = {}) {
  return cloudflareRequest(endpoint, { ...options, method: 'PUT', body });
}

async function patch(endpoint, body, options = {}) {
  return cloudflareRequest(endpoint, { ...options, method: 'PATCH', body });
}

async function del(endpoint, options = {}) {
  return cloudflareRequest(endpoint, { ...options, method: 'DELETE' });
}

async function downloadFile(url, destPath, options = {}) {
  const { timeout = 60000 } = options;
  try {
    const response = await fetchWithTimeout(url, {}, timeout);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const fs = require('fs');
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(buffer));
  } catch (error) {
    throw new NetworkError(`Failed to download file from ${url}: ${error.message}`, error);
  }
}

module.exports = {
  cloudflareRequest,
  get,
  post,
  put,
  patch,
  del,
  downloadFile
};
