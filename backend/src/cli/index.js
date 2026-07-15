const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const config = require('../config');
const logger = require('../utils/logger');
const { CsvParser, CsvTransform, CsvWriter } = require('../services/csvService');

const args = process.argv.slice(2);
const [inputPath, outputPath] = args;

if (!inputPath || !outputPath) {
  console.error(config.cli.usage);
  process.exit(1);
}

if (path.extname(inputPath).toLowerCase() !== config.csv.allowedExt) {
  logger.error('Only .csv files allowed');
  process.exit(1);
}

if (!fs.existsSync(inputPath)) {
  logger.error('Input file not found', { inputPath });
  process.exit(1);
}

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message });
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection', { error: err.message });
  process.exit(1);
});

async function main() {
  const start = Date.now();
  const parser = new CsvParser();
  const transform = new CsvTransform((chunk) => {
    chunk.data.name = chunk.data.name?.toUpperCase();
    return chunk;
  });
  const writer = new CsvWriter();
  const readStream = fs.createReadStream(inputPath, { highWaterMark: 64 * 1024 });
  const writeStream = fs.createWriteStream(outputPath);

  await pipeline(readStream, parser, transform, writer, writeStream);

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  logger.info('Done', { rows: parser.rowCount, errors: parser.errorCount, timeSec: elapsed, output: outputPath });
}

main();
