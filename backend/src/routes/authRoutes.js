const { Router } = require('express');
const AuthController = require('../controllers/authController');
const authenticate = require('../auth/middleware/authenticate');

const router = Router();

function requireOAuth(provider) {
  const envKeys = {
    google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    github: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
  };

  return (req, res, next) => {
    const missing = envKeys[provider].filter((key) => !process.env[key]);
    if (missing.length) {
      return res.status(503).json({
        success: false,
        message: `${provider} OAuth is not configured on this server`,
      });
    }
    next();
  };
}

router.post('/register', AuthController.register);
router.get('/verify-email/:token', AuthController.verifyEmail);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password/:token', AuthController.resetPassword);

router.get('/me', authenticate, AuthController.getProfile);
router.patch('/me', authenticate, AuthController.updateProfile);
router.post('/logout', authenticate, AuthController.logout);

router.get('/google', requireOAuth('google'), AuthController.googleAuth);
router.get('/google/callback', requireOAuth('google'), AuthController.googleCallback);
router.get('/github', requireOAuth('github'), AuthController.githubAuth);
router.get('/github/callback', requireOAuth('github'), AuthController.githubCallback);

module.exports = router;
