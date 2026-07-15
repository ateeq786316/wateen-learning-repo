const { Transform } = require('stream');

class CsvParser extends Transform {
  constructor() {
    super({ objectMode: true });
    this.buffer = '';
    this.rowCount = 0;
    this.errorCount = 0;
    this.headers = null;
  }

  _transform(chunk, encoding, done) {
    this.buffer += chunk.toString();

    const lines = this.buffer.split('\n');
    this.buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim().replace(/\r$/, '');
      if (!trimmed) continue;

      try {
        const values = trimmed.split(',').map(v => v.trim());
        if (!this.headers) {
          this.headers = values;
          this.push({ type: 'header', values: this.headers });
          continue;
        }
        const row = {};
        this.headers.forEach((h, i) => { row[h] = values[i] || ''; });
        this.rowCount++;
        this.push({ type: 'row', data: row });
      } catch (err) {
        this.errorCount++;
        this.push({ type: 'error', line: trimmed, error: err.message });
      }
    }
    done();
  }

  _flush(done) {
    if (this.buffer.trim()) {
      this.errorCount++;
      this.push({ type: 'error', line: this.buffer.trim(), error: 'Incomplete last row' });
    }
    done();
  }
}

class CsvTransform extends Transform {
  constructor(fn) {
    super({ objectMode: true });
    this.fn = fn;
  }

  _transform(chunk, encoding, done) {
    if (chunk.type !== 'row') return done(null, chunk);
    try {
      done(null, this.fn(chunk));
    } catch (err) {
      done(null, { type: 'error', line: JSON.stringify(chunk.data), error: err.message });
    }
  }
}

const toCsvLine = (values) =>
  values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';

class CsvWriter extends Transform {
  constructor() {
    super({ objectMode: true });
    this.headerWritten = false;
  }

  _transform(chunk, encoding, done) {
    if (chunk.type === 'header') {
      this.push(toCsvLine(chunk.values));
      this.headerWritten = true;
      return done();
    }
    if (chunk.type === 'row') {
      if (!this.headerWritten) return done(new Error('No headers received'));
      this.push(toCsvLine(Object.values(chunk.data)));
      return done();
    }
    if (chunk.type === 'error') {
      return done();
    }
    done();
  }
}

module.exports = { CsvParser, CsvTransform, CsvWriter };
