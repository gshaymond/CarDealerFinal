export function requireAuth(req, res, next) {
	if (req.session?.user) {
		return next();
	}

	return res.redirect('/auth/login');
}

export function requireRole(...allowedRoles) {
	return (req, res, next) => {
		const role = req.session?.user?.role;

		if (!role) {
			return res.redirect('/auth/login');
		}

		if (!allowedRoles.includes(role)) {
			return res.status(403).render('error', {
				title: 'Forbidden',
				message: 'You do not have access to that page.',
			});
		}

		return next();
	};
}
