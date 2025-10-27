/**
 * K6 Load Test for QR Cloner API
 * 
 * This script tests the performance of critical endpoints:
 * - Health check
 * - Shortlink redirects (/r/{code})
 * - Analytics endpoints
 * 
 * Run with: k6 run tests/performance/load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users for 1 minute
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users for 1 minute
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],  // 95% of requests should be below 500ms
    'http_req_failed': ['rate<0.05'],    // Error rate should be below 5%
    'errors': ['rate<0.1'],              // Custom error rate below 10%
  },
};

const BASE_URL = __ENV.API_BASE || 'http://localhost:8000';

export default function() {
  // Test 1: Health Check
  let healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check returns ok': (r) => r.json('ok') === true,
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: Shortlink Redirect (assuming a test shortlink exists)
  // In a real scenario, you'd create a shortlink first or use a known one
  let redirectRes = http.get(`${BASE_URL}/r/test123`, {
    redirects: 0,  // Don't follow redirects
  });
  check(redirectRes, {
    'redirect returns 302 or 404': (r) => r.status === 302 || r.status === 404,
    'redirect response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);

  sleep(1);

  // Test 3: Analytics Summary (requires auth token)
  // Note: In production, you'd use a real auth token
  const token = __ENV.AUTH_TOKEN || 'test-token';
  let analyticsRes = http.get(`${BASE_URL}/analytics/summary`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  check(analyticsRes, {
    'analytics request completes': (r) => r.status === 200 || r.status === 401,
    'analytics response time < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);

  sleep(2);
}

// Smoke test configuration for quick validation
export const smokeOptions = {
  vus: 1,
  duration: '30s',
  thresholds: {
    'http_req_duration': ['p(95)<1000'],
    'http_req_failed': ['rate<0.1'],
  },
};
