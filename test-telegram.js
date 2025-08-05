const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN not set');
  process.exit(1);
}

try {
  const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const data = await res.json();
  if (!data.ok) {
    console.error('Telegram API error:', data);
    process.exit(1);
  }
  console.log(`Bot connected: @${data.result.username}`);
} catch (err) {
  console.error('Failed to contact Telegram API:', err);
  process.exit(1);
}
