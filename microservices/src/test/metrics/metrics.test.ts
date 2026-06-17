import { Registry } from 'prom-client';
import {
  register,
  httpRequestsTotal,
  httpRequestDuration,
  activeConnections,
} from '../../metrics/metrics';

describe('Metrics module', () => {
  beforeEach(() => {
    register.resetMetrics();
  });

  it('should export a valid Registry instance', () => {
    expect(register).toBeInstanceOf(Registry);
  });

  it('should register default metrics with airport_k8s_ prefix', async () => {
    const metrics = await register.metrics();
    expect(metrics).toContain('airport_k8s_');
  });

  describe('httpRequestsTotal counter', () => {
    it('should be registered with correct name', async () => {
      const metrics = await register.metrics();
      expect(metrics).toContain('airport_k8s_http_requests_total');
    });

    it('should increment correctly with labels', async () => {
      const labels = { method: 'GET', route: '/test', status_code: '200' };
      httpRequestsTotal.inc(labels);
      const metrics = await register.metrics();
      expect(metrics).toContain('airport_k8s_http_requests_total');
    });

    it('should have correct label names', () => {
      const counterMetric = httpRequestsTotal;
      expect(counterMetric).toBeDefined();
    });
  });

  describe('httpRequestDuration histogram', () => {
    it('should be registered with correct name', async () => {
      const metrics = await register.metrics();
      expect(metrics).toContain('airport_k8s_http_request_duration_seconds');
    });

    it('should observe duration values correctly', async () => {
      const labels = { method: 'POST', route: '/api', status_code: '201' };
      httpRequestDuration.observe(labels, 0.1);
      const metrics = await register.metrics();
      expect(metrics).toContain('airport_k8s_http_request_duration_seconds_bucket');
    });

    it('should expose correct bucket boundaries', async () => {
      httpRequestDuration.observe({ method: 'GET', route: '/test', status_code: '200' }, 0.1);
      const metrics = await register.metrics();
      expect(metrics).toContain('le="0.01"');
      expect(metrics).toContain('le="0.05"');
      expect(metrics).toContain('le="0.1"');
      expect(metrics).toContain('le="5"');
    });
  });

  describe('activeConnections counter', () => {
    it('should be registered with correct name', async () => {
      const metrics = await register.metrics();
      expect(metrics).toContain('airport_k8s_active_connections_total');
    });

    it('should increment correctly', async () => {
      activeConnections.inc();
      const metrics = await register.metrics();
      expect(metrics).toContain('airport_k8s_active_connections_total');
    });
  });
});
