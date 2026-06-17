import request from 'supertest';
import express from 'express';

// Instancia capturada dentro de la factory, garantiza que siempre existe
let mockServiceInstance: {
  getUsers: jest.Mock;
  getUserById: jest.Mock;
};

jest.mock('../../services/user.service', () => {
  mockServiceInstance = {
    getUsers: jest.fn(),
    getUserById: jest.fn(),
  };
  return {
    UsersService: jest.fn().mockImplementation(() => mockServiceInstance),
  };
});

import userRouter from '../../routes/users.routes';

const app = express();
app.use(express.json());
app.use('/users', userRouter);

const mockUsers = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
];

const mockUser = { id: '1', name: 'Alice', email: 'alice@example.com' };

describe('User Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /users', () => {
    it('should return 200 and list of users on success', async () => {
      mockServiceInstance.getUsers.mockResolvedValue(mockUsers);

      const response = await request(app).get('/users');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUsers);
      expect(mockServiceInstance.getUsers).toHaveBeenCalledTimes(1);
    });

    it('should return 500 when service throws an error', async () => {
      mockServiceInstance.getUsers.mockRejectedValue(new Error('Service error'));

      const response = await request(app).get('/users');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Error retrieving users!' });
    });
  });

  describe('GET /users/:id', () => {
    it('should return 200 and a user when found', async () => {
      mockServiceInstance.getUserById.mockResolvedValue(mockUser);

      const response = await request(app).get('/users/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUser);
      expect(mockServiceInstance.getUserById).toHaveBeenCalledWith('1');
    });

    it('should return 404 when user is not found', async () => {
      mockServiceInstance.getUserById.mockRejectedValue(new Error('User not found'));

      const response = await request(app).get('/users/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'User not found!' });
    });

    it('should pass the correct id param to the service', async () => {
      mockServiceInstance.getUserById.mockResolvedValue(mockUser);

      await request(app).get('/users/42');

      expect(mockServiceInstance.getUserById).toHaveBeenCalledWith('42');
    });
  });
});
