import express from 'express';

const router = express.Router();

router.get('/register', (req, res) => {
  res.render('register');
});

router.post('/register', (req, res) => {
  // To be implemented
  res.send('Register logic coming soon');
});

router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', (req, res) => {
  // To be implemented
  res.send('Login logic coming soon');
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

export default router;