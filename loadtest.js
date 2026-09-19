// loadtest.js — SANAD PLUS⁺ Load Test
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://sanad-plus-backend.onrender.com';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m',  target: 10 },
    { duration: '30s', target: 30 },
    { duration: '1m',  target: 30 },
    { duration: '30s', target: 50 },
    { duration: '1m',  target: 50 },
    { duration: '30s', target: 100 },
    { duration: '1m',  target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'],
    'http_req_failed': ['rate<0.05'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export default function () {
  let r1 = http.get(`${BASE_URL}/api/categories/`);
  check(r1, {
    'categories: 200': (r) => r.status === 200,
    'categories: < 3s': (r) => r.timings.duration < 3000,
  });
  sleep(1);

  let r2 = http.get(`${BASE_URL}/api/products/`);
  check(r2, {
    'products: 200': (r) => r.status === 200,
    'products: < 3s': (r) => r.timings.duration < 3000,
  });
  sleep(1);

  let r3 = http.get(`${BASE_URL}/api/payment-methods/`);
  check(r3, {
    'payment-methods: 200': (r) => r.status === 200,
  });
  sleep(1);
}