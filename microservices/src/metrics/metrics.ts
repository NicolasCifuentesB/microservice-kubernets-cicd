import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

export const register = new Registry();

collectDefaultMetrics({
  register,
  prefix: 'airport_k8s_',
});

export const httpRequestsTotal = new Counter({
  name: 'airport_k8s_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'airport_k8s_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

export const activeConnections = new Counter({
  name: 'airport_k8s_active_connections_total',
  help: 'Total number of active connections',
  registers: [register],
});
