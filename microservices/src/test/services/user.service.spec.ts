
import { config } from "../../config/env";
import { UsersService } from "../../services/user.service";


jest.mock('../../config/env', () => ({
  config: {
    apiUrl: 'http://mock-api.com',
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    service = new UsersService();
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return users when response is ok', async () => {
      const mockUsers = [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUsers),
      });

      const result = await service.getUsers();

      expect(mockFetch).toHaveBeenCalledWith(`${config.apiUrl}/users`);
      expect(result).toEqual(mockUsers);
    });

    it('should throw an error when response is not ok', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(service.getUsers()).rejects.toThrow('Error getting users');
    });

    it('should call the correct URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([]),
      });

      await service.getUsers();

      expect(mockFetch).toHaveBeenCalledWith('http://mock-api.com/users');
    });
  });

  describe('getUserById', () => {
    it('should return a user when response is ok', async () => {
      const mockUser = { id: '1', name: 'Alice', email: 'alice@example.com' };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.getUserById('1');

      expect(mockFetch).toHaveBeenCalledWith(`${config.apiUrl}/users/1`);
      expect(result).toEqual(mockUser);
    });

    it('should throw an error with the user id when not found', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(service.getUserById('99')).rejects.toThrow('User 99 not found');
    });

    it('should call the correct URL with the given id', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });

      await service.getUserById('42');

      expect(mockFetch).toHaveBeenCalledWith('http://mock-api.com/users/42');
    });
  });
});