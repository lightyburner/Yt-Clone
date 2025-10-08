const { PrismaClient } = require('@prisma/client');
const env = require('./env');

let prisma;

function getPrisma() {
	if (!prisma) {
		// Ensure Prisma has a DATABASE_URL and normalize protocol for Postgres
		let url = process.env.DATABASE_URL || env.databaseUrl;
		if (!url) {
			throw new Error('DATABASE_URL is not set. Configure it in .env (or SUPABASE_DB_URL/POSTGRES_URL).');
		}
		process.env.DATABASE_URL = url;
		prisma = new PrismaClient();
	}
	return prisma;
}

module.exports = { prisma: getPrisma() };