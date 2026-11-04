const jwt = require('jsonwebtoken');
const { COOKIE_NAME } = require('../utils/token');

function requireAuth(req, res, next) {
  // 1. Ambil token dari cookie
  let token = req.cookies?.[COOKIE_NAME];

  // 2. Cadangan: dari header "Authorization: Bearer <token>"
  const header = req.headers.authorization;
  if (!token && header?.startsWith('Bearer ')) {
    token = header.slice(7);
  }

  // 3. Tidak ada token -> tolak
  if (!token) {
    return res.status(401).json({ success: false, message: 'Silakan login terlebih dahulu' });
  }

  // 4. Cek keaslian token
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Sesi tidak valid atau sudah berakhir, silakan login ulang' });
  }
}

module.exports = requireAuth;