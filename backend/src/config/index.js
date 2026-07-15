const path = require('path');

module.exports = {
  cli: {
    usage: 'Usage: node src/cli/index.js <input.csv> <output.csv>',
  },
  csv: {
    batchSize: 1000,
    allowedExt: '.csv',
  },
  upload: {
    dir: path.join(__dirname, '../../uploads'),
    maxSize: 10 * 1024 * 1024,
    allowedExt: ['.xlsx', '.xls', '.csv'],
  },
};
