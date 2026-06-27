import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import { sessionConfig } from './src/config.js';
import authRoutes from './src/routes/auth.js';
import indexRoutes from './src/routes/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', 'src/views');

// Session middleware
app.use(session(sessionConfig));
app.use((req, res, next) => {
  res.locals.user = req.session?.user || null;
  res.locals.title = 'Turbo Car Deals';
  next();
});

// Routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);

// Error handler (basic)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).render('error', { message: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});