import bcrypt from 'bcrypt';
import pool from '../db.js';

// Helper function to render forms with error messages and form values
function renderForm(res, view, values) {
	return res.render(view, values);
}

// GET /auth/register
// GET /auth/login
// POST /auth/register
// POST /auth/login
// GET /auth/logout
export function getRegister(req, res) {
	renderForm(res, 'register', { title: 'Register', error: null, form: {} });
}

// GET /auth/login
export function getLogin(req, res) {
	renderForm(res, 'login', { title: 'Login', error: null, form: {} });
}

// POST /auth/register
export async function register(req, res, next) {
	try {
		const displayName = (req.body.displayName || '').trim();
		const email = (req.body.email || '').trim().toLowerCase();
		const password = req.body.password || '';

		if (!displayName || !email || password.length < 8) {
			return res.status(400).render('register', {
				title: 'Register',
				error: 'Enter a name, email, and password with at least 8 characters.',
				form: { displayName, email },
			});
		}

		const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
		if (existingUser.rows.length > 0) {
			return res.status(400).render('register', {
				title: 'Register',
				error: 'That email is already in use.',
				form: { displayName, email },
			});
		}

		const roleResult = await pool.query('SELECT id, name FROM roles WHERE name = $1', ['standard']);
		if (roleResult.rows.length === 0) {
			return res.status(500).render('register', {
				title: 'Register',
				error: 'Registration is not ready yet.',
				form: { displayName, email },
			});
		}

		const passwordHash = await bcrypt.hash(password, 10);
		const result = await pool.query(
			'INSERT INTO users (display_name, email, password_hash, role_id) VALUES ($1, $2, $3, $4) RETURNING id, display_name, email',
			[displayName, email, passwordHash, roleResult.rows[0].id]
		);

		req.session.user = {
			id: result.rows[0].id,
			displayName: result.rows[0].display_name,
			email: result.rows[0].email,
			role: roleResult.rows[0].name,
		};

		return res.redirect('/dashboard');
	} catch (error) {
		return next(error);
	}
}

// POST /auth/login
export async function login(req, res, next) {
	try {
		const email = (req.body.email || '').trim().toLowerCase();
		const password = req.body.password || '';

		if (!email || !password) {
			return res.status(400).render('login', {
				title: 'Login',
				error: 'Enter your email and password.',
				form: { email },
			});
		}

		const result = await pool.query(
			`SELECT u.id, u.display_name, u.email, u.password_hash, r.name AS role
			 FROM users u
			 JOIN roles r ON r.id = u.role_id
			 WHERE u.email = $1`,
			[email]
		);

		const user = result.rows[0];
		const passwordMatches = user && (await bcrypt.compare(password, user.password_hash));

		if (!passwordMatches) {
			return res.status(400).render('login', {
				title: 'Login',
				error: 'Invalid email or password.',
				form: { email },
			});
		}

		req.session.user = {
			id: user.id,
			displayName: user.display_name,
			email: user.email,
			role: user.role,
		};

		return res.redirect('/dashboard');
	} catch (error) {
		return next(error);
	}
}

// GET /auth/logout
export function logout(req, res, next) {
	req.session.destroy((error) => {
		if (error) {
			return next(error);
		}

		return res.redirect('/');
	});
}
