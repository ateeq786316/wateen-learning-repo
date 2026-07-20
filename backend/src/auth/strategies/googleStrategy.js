const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const AuthService = require('../../services/authService');

function configureGoogleStrategy() {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL;

  if (!clientID || !clientSecret) {
    console.warn('[GoogleStrategy] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set — skipping');
    return;
  }

  passport.use(
    'google',
    new GoogleStrategy(
      { clientID, clientSecret, callbackURL, scope: ['profile', 'email'] },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email returned from Google'), null);
          }

          const result = await AuthService.findOrCreateOAuthUser({
            provider: 'GOOGLE',
            providerId: profile.id,
            email,
            name: profile.displayName,
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

module.exports = configureGoogleStrategy;
