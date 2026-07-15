const fs = require('fs');
const path = require('path');
const config = require('../config');

exports.upload = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  res.json({
    message: 'File uploaded',
    file: {
      id: path.parse(req.file.filename).name,
      originalName: req.file.originalname,
      size: req.file.size,
      path: req.file.path,
    },
  });
};

exports.list = (req, res) => {
  fs.readdir(config.upload.dir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Cannot read uploads' });
    res.json({ files });
  });
};
