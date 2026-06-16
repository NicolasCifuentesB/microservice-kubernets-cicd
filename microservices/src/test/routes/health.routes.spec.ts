import request from 'supertest';
import express from 'express';
import healthRouter from '../../routes/health.routes';

const app = express();
app.use(express.json());
app.use('/health', healthRouter);

describe('Health Routes', () => {
  describe('GET /health', () => {
    it('should return 200 status code', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
    });

    it('should return status UP', async () => {
      const response = await request(app).get('/health');

      expect(response.body).toHaveProperty('status', 'UP');
    });

    it('should return a timestamp', async () => {
      const before = new Date().getTime();
      const response = await request(app).get('/health');
      const after = new Date().getTime();

      expect(response.body).toHaveProperty('timestamp');

      const timestamp = new Date(response.body.timestamp).getTime();
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should return a valid ISO timestamp string', async () => {
      const response = await request(app).get('/health');

      const timestamp = response.body.timestamp;
      expect(new Date(timestamp).toString()).not.toBe('Invalid Date');
    });

    it('should return JSON content-type', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
