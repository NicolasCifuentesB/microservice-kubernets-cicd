import request from 'supertest';
import express from 'express';

jest.mock('../../metrics/metrics', () => ({
  register: {
    contentType: 'text/plain; version=0.0.4; charset=utf-8',
    metrics: jest.fn(),
  },
}));

import { register } from '../../metrics/metrics';
import metricsRouter from '../../routes/metrics.routes';

const app = express();
app.use('/metrics', metricsRouter);

describe('Metrics Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /metrics', () => {
    it('should return 200 with prometheus metrics', async () => {
      const mockMetrics = `
# HELP airport_k8s_http_requests_total Total number of HTTP requests
# TYPE airport_k8s_http_requests_total counter
airport_k8s_http_requests_total{method="GET",route="/metrics",status_code="200"} 1
      `.trim();

      (register.metrics as jest.Mock).mockResolvedValue(mockMetrics);

      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('airport_k8s_http_requests_total');
    });

    it('should set correct Content-Type header', async () => {
      (register.metrics as jest.Mock).mockResolvedValue('# metrics');

      const response = await request(app).get('/metrics');

      expect(response.headers['content-type']).toContain(
        'text/plain; version=0.0.4; charset=utf-8',
      );
    });

    it('should return 500 when register.metrics throws', async () => {
      (register.metrics as jest.Mock).mockRejectedValue(new Error('Registry error'));

      const response = await request(app).get('/metrics');

      expect(response.status).toBe(500);
    });

    it('should call register.metrics once per request', async () => {
      (register.metrics as jest.Mock).mockResolvedValue('# ok');

      await request(app).get('/metrics');

      expect(register.metrics).toHaveBeenCalledTimes(1);
    });

    it('should expose airport_k8s prefixed metrics', async () => {
      const mockMetrics = [
        '# HELP airport_k8s_http_request_duration_seconds Duration of HTTP requests',
        '# TYPE airport_k8s_http_request_duration_seconds histogram',
        'airport_k8s_http_request_duration_seconds_bucket{le="0.01"} 0',
        '# HELP airport_k8s_active_connections_total Total active connections',
        'airport_k8s_active_connections_total 0',
      ].join('\n');

      (register.metrics as jest.Mock).mockResolvedValue(mockMetrics);

      const response = await request(app).get('/metrics');

      expect(response.text).toContain('airport_k8s_http_request_duration_seconds');
      expect(response.text).toContain('airport_k8s_active_connections_total');
    });
  });
});
