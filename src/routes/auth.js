import express from 'express';
import {
  getLogin,
  getRegister,
  login,
  logout,
  register,
} from '../controllers/authController.js';

const router = express.Router();

router.get('/register', getRegister);
router.post('/register', register);
router.get('/login', getLogin);
router.post('/login', login);
router.get('/logout', logout);

export default router;