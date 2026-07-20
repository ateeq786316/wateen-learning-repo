const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
const importRoutes = require('./routes/importRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const configureGoogleStrategy = require('./auth/strategies/googleStrategy');
const configureGitHubStrategy = require('./auth/strategies/githubStrategy');

const app = express();

configureGoogleStrategy();
configureGitHubStrategy();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(passport.initialize());

app.get('/', (req, res) => res.json({ status: 'running' }));

app.use('/api/auth', authRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/users', userRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack || err);
  const status = err.statusCode || err.status || 500;
  const message = err.statusCode ? err.message : (err.message || 'Internal error');
  res.status(status).json({ error: message, success: false });
});

module.exports = app;
