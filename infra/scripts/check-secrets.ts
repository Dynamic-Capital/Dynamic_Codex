const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TELEGRAM_BOT_TOKEN',
  'ADMIN_USER_ID',
  'VIP_CHAT_ID',
  'WEBAPP_URL',
  'BSC_RPC_URL',
  'TRON_API_URL',
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error('Missing environment variables:\n');
  for (const key of missing) {
    console.error(`- ${key}`);
    console.error(`  Supabase: supabase secrets set ${key} "<value>"`);
    console.error(`  GitHub:   gh secret set ${key} -R <org>/<repo>\n`);
  }
  process.exit(1);
} else {
  console.log('All required secrets are set.');
}
