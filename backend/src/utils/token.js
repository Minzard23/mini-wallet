const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'token';
const isProduction = process.env.NODE_ENV === 'production';

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' },
  );
}

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000,
};

module.exports = { COOKIE_NAME, signToken, cookieOptions };