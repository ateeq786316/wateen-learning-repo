const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const importRoutes = require('./routes/importRoutes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'running' }));

app.use('/api/imports', importRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal error' });
});

module.exports = app;
