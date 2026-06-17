import { Router, Request, Response } from 'express';
import { register } from '../metrics/metrics';

const router = Router();

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

export default router;
