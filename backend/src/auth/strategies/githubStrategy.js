const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const AuthService = require('../../services/authService');

function configureGitHubStrategy() {
  const clientID = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const callbackURL = process.env.GITHUB_CALLBACK_URL;

  if (!clientID || !clientSecret) {
    console.warn('[GitHubStrategy] GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not set — skipping');
    return;
  }

  passport.use(
    'github',
    new GitHubStrategy(
      { clientID, clientSecret, callbackURL, scope: ['user:email'] },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.find((e) => e.verified)?.value || profile.emails?.[0]?.value;
          if (!email || !email.includes('@')) {
            return done(new Error('No verified email returned from GitHub'), null);
          }
          const name = profile.displayName || profile.username;

          const result = await AuthService.findOrCreateOAuthUser({
            provider: 'GITHUB',
            providerId: profile.id,
            email,
            name,
            avatar: profile.photos?.[0]?.value,
          });

          done(null, result);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );
}

module.exports = configureGitHubStrategy;
