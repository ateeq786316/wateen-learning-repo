const { verifyAccessToken } = require('../utils/token');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    return next(err);
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const error = new Error('Access token expired');
      error.statusCode = 401;
      error.code = 'TOKEN_EXPIRED';
      return next(error);
    }
    const error = new Error('Invalid access token');
    error.statusCode = 401;
    next(error);
  }
}

module.exports = authenticate;
