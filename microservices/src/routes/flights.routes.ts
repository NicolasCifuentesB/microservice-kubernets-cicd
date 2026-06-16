import { Router } from 'express';
import { FlightService } from '../services/flight.service';

const router = Router();
const flightService = new FlightService();

router.get('/', async (_, res) => {
  try {
    const users = await flightService.getFlight();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving flights',
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const flight = await flightService.getFlightById(req.params.id);

    res.status(200).json(flight);
  } catch (error) {
    res.status(404).json({
      message: 'Flight not found',
    });
  }
});

export default router;
