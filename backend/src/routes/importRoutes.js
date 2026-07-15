const { Router } = require('express');
const upload = require('../middleware/upload');
const importController = require('../controllers/importController');

const router = Router();

router.post('/upload', upload.single('file'), importController.upload);
router.get('/files', importController.list);

module.exports = router;
