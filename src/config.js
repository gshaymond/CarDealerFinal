const isProduction = process.env.NODE_ENV === 'production';

// Session configuration for express-session
export const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'development-session-secret',
    resave: false,
    saveUninitialized: false,
    proxy: isProduction,
    cookie: {
        secure: isProduction,
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
};