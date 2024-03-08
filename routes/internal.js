const express = require('express');
const router = express.Router();
const { searchTheBible } = require('../utils/search');
const path = require('path');

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/index.html'));
});

router.get('/study-generator', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/study-generator.html'));
});

router.get('/sermon-title-tool', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/sermon-title-tool.html'));
});

router.post('/search-html', async (req, res) => {
    try {
        const { query } = req.body;
        const results = await searchTheBible(query);
        // Begin constructing an HTML response
        let htmlResponse = '<div>';

        if (results.length > 0) {
            results.forEach((result) => {
                const url = `https://www.biblegateway.com/passage/?search=${result.book}+${result.chapter}:${result.verse}&version=KJV`;
                htmlResponse += `
        <div class="search-result mb-4 p-4 bg-white rounded shadow my-4">
            <h2 class="text-lg font-semibold text-blue-700 underline"><a href="${url}" target="_blank">${result.book} ${result.chapter}:${result.verse}</a></h2>
            <p class="text-gray-600 mt-2">${result.text}</p>
        </div>
    `;
            });
        } else {
            htmlResponse += '<p class="text-gray-600">No results found.</p>';
        }

        htmlResponse += '</div>';

        // Send the HTML response back to the client
        res.send(htmlResponse);
    } catch (error) {
        console.error('Error searching the Bible:', error);
        res.status(500).json({ error: 'An error occurred while searching the Bible' });
    }
});

module.exports = router;
