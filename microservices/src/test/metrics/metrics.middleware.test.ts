import { Request, Response, NextFunction } from 'express';
import { metricsMiddleware } from '../../metrics/metrics.middleware';
import { httpRequestsTotal, httpRequestDuration } from '../../metrics/metrics';

jest.mock('../../metrics/metrics', () => ({
  httpRequestsTotal: {
    inc: jest.fn(),
  },
  httpRequestDuration: {
    observe: jest.fn(),
  },
}));

const buildMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  method: 'GET',
  path: '/test',
  route: undefined,
  ...overrides,
});

const buildMockResponse = (): Partial<Response> => {
  const listeners: Record<string, () => void> = {};
  return {
    statusCode: 200,
    on: jest.fn((event: string, cb: () => void) => {
      listeners[event] = cb;
      return {} as Response;
    }),
    emit: jest.fn((event: string) => {
      if (listeners[event]) listeners[event]();
      return true;
    }),
  };
};

describe('metricsMiddleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
  });

  it('should call next()', () => {
    const req = buildMockRequest() as Request;
    const res = buildMockResponse() as Response;

    metricsMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should register a finish listener on the response', () => {
    const req = buildMockRequest() as Request;
    const res = buildMockResponse() as Response;

    metricsMiddleware(req, res, next);

    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should increment httpRequestsTotal on finish with correct labels', () => {
    const req = buildMockRequest({ method: 'GET', path: '/flights' }) as Request;
    const res = buildMockResponse() as Response;

    metricsMiddleware(req, res, next);
    (res as { emit: (e: string) => void }).emit('finish');

    expect(httpRequestsTotal.inc).toHaveBeenCalledWith({
      method: 'GET',
      route: '/flights',
      status_code: '200',
    });
  });

  it('should observe httpRequestDuration on finish', () => {
    const req = buildMockRequest({ method: 'POST', path: '/api/data' }) as Request;
    const res = buildMockResponse() as Response;

    metricsMiddleware(req, res, next);
    (res as { emit: (e: string) => void }).emit('finish');

    expect(httpRequestDuration.observe).toHaveBeenCalledWith(
      { method: 'POST', route: '/api/data', status_code: '200' },
      expect.any(Number),
    );
  });

  it('should use route.path over req.path when route is defined', () => {
    const req = buildMockRequest({
      method: 'GET',
      path: '/flights/1',
      route: { path: '/flights/:id' } as Request['route'],
    }) as Request;
    const res = buildMockResponse() as Response;

    metricsMiddleware(req, res, next);
    (res as { emit: (e: string) => void }).emit('finish');

    expect(httpRequestsTotal.inc).toHaveBeenCalledWith({
      method: 'GET',
      route: '/flights/:id',
      status_code: '200',
    });
  });

  it('should record a non-negative duration', () => {
    const req = buildMockRequest() as Request;
    const res = buildMockResponse() as Response;

    metricsMiddleware(req, res, next);
    (res as { emit: (e: string) => void }).emit('finish');

    const observeCall = (httpRequestDuration.observe as jest.Mock).mock.calls[0];
    const duration = observeCall[1] as number;
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('should use status code from response', () => {
    const req = buildMockRequest({ method: 'DELETE', path: '/resource/1' }) as Request;
    const res = buildMockResponse() as Response;
    res.statusCode = 404;

    metricsMiddleware(req, res, next);
    (res as { emit: (e: string) => void }).emit('finish');

    expect(httpRequestsTotal.inc).toHaveBeenCalledWith({
      method: 'DELETE',
      route: '/resource/1',
      status_code: '404',
    });
  });
});
