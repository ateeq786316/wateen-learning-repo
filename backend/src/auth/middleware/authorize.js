function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      return next(err);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const err = new Error('Insufficient permissions');
      err.statusCode = 403;
      return next(err);
    }

    next();
  };
}

module.exports = authorize;
