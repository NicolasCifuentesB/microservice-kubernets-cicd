import request from 'supertest';
import express from 'express';

// Instancia capturada dentro de la factory, garantiza que siempre existe
let mockServiceInstance: {
  getFlight: jest.Mock;
  getFlightById: jest.Mock;
};

jest.mock('../../services/flight.service', () => {
  mockServiceInstance = {
    getFlight: jest.fn(),
    getFlightById: jest.fn(),
  };
  return {
    FlightService: jest.fn().mockImplementation(() => mockServiceInstance),
  };
});

import flightRouter from '../../routes/flights.routes';

const app = express();
app.use(express.json());
app.use('/flights', flightRouter);

const mockFlights = [
  { id: '1', origin: 'BOG', destination: 'MED', price: 200 },
  { id: '2', origin: 'CLO', destination: 'BOG', price: 150 },
];

const mockFlight = { id: '1', origin: 'BOG', destination: 'MED', price: 200 };

describe('Flight Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /flights', () => {
    it('should return 200 and list of flights on success', async () => {
      mockServiceInstance.getFlight.mockResolvedValue(mockFlights);

      const response = await request(app).get('/flights');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockFlights);
      expect(mockServiceInstance.getFlight).toHaveBeenCalledTimes(1);
    });

    it('should return 500 when service throws an error', async () => {
      mockServiceInstance.getFlight.mockRejectedValue(new Error('Service error'));

      const response = await request(app).get('/flights');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Error retrieving flights!' });
    });
  });

  describe('GET /flights/:id', () => {
    it('should return 200 and a flight when found', async () => {
      mockServiceInstance.getFlightById.mockResolvedValue(mockFlight);

      const response = await request(app).get('/flights/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockFlight);
      expect(mockServiceInstance.getFlightById).toHaveBeenCalledWith('1');
    });

    it('should return 404 when flight is not found', async () => {
      mockServiceInstance.getFlightById.mockRejectedValue(new Error('Flight not found'));

      const response = await request(app).get('/flights/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Flight not found!' });
    });

    it('should pass the correct id param to the service', async () => {
      mockServiceInstance.getFlightById.mockResolvedValue(mockFlight);

      await request(app).get('/flights/42');

      expect(mockServiceInstance.getFlightById).toHaveBeenCalledWith('42');
    });
  });
});
