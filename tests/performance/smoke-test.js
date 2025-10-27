/**
 * K6 Smoke Test for QR Cloner API
 * 
 * Quick smoke test to verify basic functionality.
 * Run with: k6 run tests/performance/smoke-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    'http_req_duration': ['p(95)<1000'],  // 95% under 1s
    'http_req_failed': ['rate<0.1'],      // Error rate under 10%
  },
};

const BASE_URL = __ENV.API_BASE || 'http://localhost:8000';

export default function() {
  // Test health endpoint
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health response is ok': (r) => r.json('ok') === true,
  });

  sleep(1);

  // Test shortlink redirect (should return 404 for non-existent code)
  const redirectRes = http.get(`${BASE_URL}/r/smoke-test-code`, {
    redirects: 0,
  });
  check(redirectRes, {
    'redirect returns valid status': (r) => r.status === 302 || r.status === 404,
  });

  sleep(1);

  // Test API docs (if available)
  const docsRes = http.get(`${BASE_URL}/docs`);
  check(docsRes, {
    'docs accessible': (r) => r.status === 200,
  });

  sleep(2);
}
