import request from 'supertest';
import express from 'express';
import messageRouter from '../../routes/message.routes';
import { getMessage } from '../../controllers/message.controller';

jest.mock('../../controllers/message.controller');

const mockedGetMessage = getMessage as jest.Mock;

const app = express();
app.use(express.json());
app.use('/message', messageRouter);

describe('Message Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /message', () => {
    it('should call getMessage controller', async () => {
      mockedGetMessage.mockImplementation((_, res) => {
        res.json({ service: 'test-service', message: 'Microservice running correctly with update 🚀' });
      });

      const response = await request(app).get('/message');

      expect(mockedGetMessage).toHaveBeenCalledTimes(1);
    });

    it('should return 200 and the controller response', async () => {
      const mockPayload = {
        service: 'test-service',
        message: 'Microservice running correctly with update 🚀',
      };

      mockedGetMessage.mockImplementation((_, res) => {
        res.json(mockPayload);
      });

      const response = await request(app).get('/message');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockPayload);
    });

    it('should return JSON content-type', async () => {
      mockedGetMessage.mockImplementation((_, res) => {
        res.json({ service: 'svc', message: 'ok' });
      });

      const response = await request(app).get('/message');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});