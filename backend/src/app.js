const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const importRoutes = require('./routes/importRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'running' }));

app.use('/api/imports', importRoutes);
app.use('/api/users', userRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || err.status || 500;
  const message = err.statusCode ? err.message : 'Internal error';
  res.status(status).json({ error: message });
});

module.exports = app;
