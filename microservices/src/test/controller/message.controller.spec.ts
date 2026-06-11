import { Request, Response } from 'express';
import { getMessage } from '../../controllers/message.controller';
import { config } from '../../config/env';

jest.mock('../../config/env', () => ({
  config: {
    serviceName: 'test-service',
  },
}));

describe('MessageController - getMessage', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    mockRequest = {};
    mockResponse = {
      json: jsonMock,
    };
  });

  it('should return service name and message', () => {
    getMessage(mockRequest as Request, mockResponse as Response);

    expect(jsonMock).toHaveBeenCalledTimes(1);
    expect(jsonMock).toHaveBeenCalledWith({
      service: config.serviceName,
      message: 'Microservice running correctly with update! 🚀',
    });
  });

  it('should return the correct serviceName from config', () => {
    getMessage(mockRequest as Request, mockResponse as Response);

    const responseBody = jsonMock.mock.calls[0][0];
    expect(responseBody.service).toBe('test-service');
  });

  it('should always include the message field', () => {
    getMessage(mockRequest as Request, mockResponse as Response);

    const responseBody = jsonMock.mock.calls[0][0];
    expect(responseBody).toHaveProperty('message');
    expect(typeof responseBody.message).toBe('string');
  });
});