require('dotenv').config();

const env = {
	nodeEnv: process.env.NODE_ENV || 'development',
	port: parseInt(process.env.PORT || '3000', 10),
	frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

	databaseUrl: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
	// databaseUrl: process.env.SUPABASE_DB_URL,

	supabaseUrl: process.env.SUPABASE_URL,
	supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
	supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

	jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-secret-change' : ''),
	jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

	smtp: {
		host: process.env.SMTP_HOST,
		port: parseInt(process.env.SMTP_PORT || '587', 10),
		secure: process.env.SMTP_SECURE === 'true',
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
		from: process.env.SMTP_FROM || 'no-reply@example.com',
	},
};

module.exports = env;


