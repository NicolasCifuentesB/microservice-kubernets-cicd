import { Router } from 'express';
import { UsersService } from '../services/user.service';

const router = Router();
const usersService = new UsersService();

router.get('/', async (_, res) => {
  try {
    const users = await usersService.getUsers();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving users!',
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await usersService.getUserById(req.params.id);

    res.status(200).json(user);
  } catch (error) {
    res.status(404).json({
      message: 'User not found!',
    });
  }
});

export default router;
