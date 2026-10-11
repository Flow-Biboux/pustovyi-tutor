const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const b = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};
  if (b.website) return res.status(200).json({ ok: true }); // honeypot

  const name = String(b.name || '').trim().slice(0, 100);
  const phone = String(b.phone || '').trim();
  const email = String(b.email || '').trim().slice(0, 150);
  const telegram = String(b.telegram || '').trim().replace(/^@/, '');
  const message = String(b.message || '').trim().slice(0, 3000);
  const lang = b.lang === 'ru' ? 'RU' : 'UA';

  if (
    !name || !message ||
    !/^\+?[0-9\s\-()]{7,20}$/.test(phone) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ||
    !/^[A-Za-z0-9_]{5,32}$/.test(telegram)
  ) return res.status(400).json({ error: 'invalid' });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return res.status(500).json({ error: 'not_configured' });

  const text =
    `<b>Нова заявка з сайту</b> (${lang})\n\n` +
    `<b>Ім'я:</b> ${esc(name)}\n` +
    `<b>Телефон:</b> ${esc(phone)}\n` +
    `<b>Email:</b> ${esc(email)}\n` +
    `<b>Telegram:</b> <a href="https://t.me/${telegram}">@${telegram}</a>\n\n` +
    `<b>Повідомлення:</b>\n${esc(message)}`;

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    if (!r.ok) return res.status(502).json({ error: 'telegram_failed' });
    return res.status(200).json({ ok: true });
  } catch (_) {
    return res.status(502).json({ error: 'telegram_failed' });
  }
};

function safeParse(s) { try { return JSON.parse(s); } catch (_) { return {}; } }
