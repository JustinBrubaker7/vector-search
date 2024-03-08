const express = require('express');
const router = express.Router();

// GET route example
router.get('/example', (req, res) => {
    res.json({ message: 'This is an example GET response from the external API!' });
});

// POST route example
router.post('/example', (req, res) => {
    // Echo back the received request body
    res.json({
        message: 'This is an example POST response from the external API!',
        yourData: req.body,
    });
});

module.exports = router;
