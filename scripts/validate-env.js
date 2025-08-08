const required = [
  'NANGO_SECRET_KEY',
  'NANGO_WEBHOOK_SECRET',
  'ZEP_API_KEY'
];

const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(key => console.error(`   - ${key}`));
  console.error('\n📝 Check .env.example for configuration details');
  process.exit(1);
}

console.log('✅ Environment variables validated');