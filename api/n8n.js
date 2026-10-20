// Proxy Mini App -> n8n. Xác thực Telegram initData, rồi chuyển tiếp kèm header bí mật.
// Env: BOT_TOKEN, N8N_BASE, N8N_SECRET, N8N_AUTH_HEADER (mặc định Authorization), N8N_PREFIX (mặc định webhook)
const crypto = require('crypto');

const ALLOWED = { 'expense-create': true, 'expense-ocr': true };
const MAX_AGE_SEC = 24 * 3600;

function verifyInitData(initData, botToken) {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const check = Array.from(params.entries())
    .map(([k, v]) => k + '=' + v)
    .sort()
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calc = crypto.createHmac('sha256', secret).update(check).digest('hex');
  const a = Buffer.from(calc, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const age = Math.floor(Date.now() / 1000) - Number(params.get('auth_date') || 0);
  if (!(age >= 0 && age < MAX_AGE_SEC)) return null;
  try {
    return JSON.parse(params.get('user') || 'null');
  } catch (e) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { BOT_TOKEN, N8N_BASE, N8N_SECRET } = process.env;
  if (!BOT_TOKEN || !N8N_BASE || !N8N_SECRET) {
    return res.status(500).json({ error: 'Thiếu biến môi trường (BOT_TOKEN, N8N_BASE, N8N_SECRET)' });
  }

  const route = String((req.query && req.query.path) || '');
  if (!ALLOWED[route]) return res.status(404).json({ error: 'Không có endpoint này' });

  const user = verifyInitData(String(req.headers['x-telegram-init-data'] || ''), BOT_TOKEN);
  if (!user || !user.id) return res.status(403).json({ error: 'Phiên Telegram không hợp lệ, hãy mở lại Mini App từ bot' });

  const prefix = process.env.N8N_PREFIX || 'webhook';
  const url = N8N_BASE.replace(/\/+$/, '') + '/' + prefix + '/' + route;
  const authHeader = process.env.N8N_AUTH_HEADER || 'Authorization';

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [authHeader]: N8N_SECRET,
        'x-tg-user': String(user.id)
      },
      body: JSON.stringify(req.body || {})
    });
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(502).json({ error: 'n8n trả về dữ liệu không phải JSON (HTTP ' + r.status + '). Kiểm tra N8N_BASE / workflow đã Publish chưa.' });
    }
    if (r.status === 403 && !data.error) data.error = 'n8n từ chối (403): sai N8N_SECRET hoặc tên header';
    if (r.status === 404 && !data.error) data.error = 'n8n 404: workflow chưa Publish hoặc sai đường dẫn webhook';
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'Không gọi được n8n: ' + e.message });
  }
};
