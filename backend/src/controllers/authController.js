const passport = require('passport');
const AuthService = require('../services/authService');
const {
  validateRegister,
  validateLogin,
  validateRefresh,
  validateForgotPassword,
  validateResetPassword,
  validateUpdateProfile,
} = require('../auth/validators/authValidator');

const AuthController = {

  async register(req, res, next) {
    try {
      const data = validateRegister(req.body);
      const result = await AuthService.register(data);
      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req, res, next) {
    try {
      const { token } = req.params;
      const result = await AuthService.verifyEmail(token);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const data = validateLogin(req.body);
      const result = await AuthService.login(data);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req, res, next) {
    try {
      const { refreshToken } = validateRefresh(req.body);
      const result = await AuthService.refresh(refreshToken);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const result = await AuthService.logout(req.user.id);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  async getProfile(req, res, next) {
    try {
      const result = await AuthService.getProfile(req.user.id);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const updates = validateUpdateProfile(req.body);
      const result = await AuthService.updateProfile(req.user.id, updates);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req, res, next) {
    try {
      const data = validateForgotPassword(req.body);
      const result = await AuthService.forgotPassword(data);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const { token } = req.params;
      const data = validateResetPassword(req.body);
      const result = await AuthService.resetPassword({ token, password: data.password });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  googleAuth: passport.authenticate('google', { session: false, scope: ['profile', 'email'] }),

  googleCallback: (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, result) => {
      if (err) return next(err);
      if (!result) return res.status(401).json({ success: false, message: 'Google authentication failed' });
      res.json({ success: true, ...result });
    })(req, res, next);
  },

  githubAuth: passport.authenticate('github', { session: false, scope: ['user:email'] }),

  githubCallback: (req, res, next) => {
    passport.authenticate('github', { session: false }, (err, result) => {
      if (err) return next(err);
      if (!result) return res.status(401).json({ success: false, message: 'GitHub authentication failed' });
      res.json({ success: true, ...result });
    })(req, res, next);
  },

};

module.exports = AuthController;
