import { config } from '../../config/env';
import { FlightService } from '../../services/flight.service';

jest.mock('../../config/env', () => ({
  config: {
    apiUrl: 'http://mock-api.com',
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('FlightService', () => {
  let service: FlightService;

  beforeEach(() => {
    service = new FlightService();
    jest.clearAllMocks();
  });

  describe('getFlight', () => {
    it('should return flights when response is ok', async () => {
      const mockFlights = [
        { id: '1', origin: 'BOG', destination: 'MED' },
        { id: '2', origin: 'CLO', destination: 'BOG' },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockFlights),
      });

      const result = await service.getFlight();

      expect(mockFetch).toHaveBeenCalledWith(`${config.apiUrl}/flight`);
      expect(result).toEqual(mockFlights);
    });

    it('should throw an error when response is not ok', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(service.getFlight()).rejects.toThrow('Error getting flight!');
    });

    it('should call the correct URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([]),
      });

      await service.getFlight();

      expect(mockFetch).toHaveBeenCalledWith('http://mock-api.com/flight');
    });
  });

  describe('getFlightById', () => {
    it('should return a flight when response is ok', async () => {
      const mockFlight = { id: '1', origin: 'BOG', destination: 'MED' };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockFlight),
      });

      const result = await service.getFlightById('1');

      expect(mockFetch).toHaveBeenCalledWith(`${config.apiUrl}/flight/1`);
      expect(result).toEqual(mockFlight);
    });

    it('should throw an error with the flight id when not found', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(service.getFlightById('99')).rejects.toThrow('Flight 99 not found!');
    });

    it('should call the correct URL with the given id', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });

      await service.getFlightById('42');

      expect(mockFetch).toHaveBeenCalledWith('http://mock-api.com/flight/42');
    });
  });
});
