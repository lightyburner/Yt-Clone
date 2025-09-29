const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

const supabaseKey = env.supabaseServiceKey || env.supabaseAnonKey;

const supabase = createClient(
	env.supabaseUrl,
	supabaseKey,
	{ auth: { persistSession: false } }
);

const testConnection = async () => {
	if (!env.supabaseUrl || !supabaseKey) {
		throw new Error('Missing Supabase URL or API Key');
	}
	console.log('✅ Supabase client initialized');
};

module.exports = { supabase, testConnection };
