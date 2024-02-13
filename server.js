const express = require('express');
const port = 3000;
const path = require('path');
const OpenAI = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');
const BookOfJohn = require('./Bible-kjv/John.json');

const fs = require('fs').promises;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
});

const namespace = 'bible-search';
const index = pinecone.index(namespace);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// server the HTML file to the client from the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/search', async (req, res) => {
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

const getEmbedding = async (text) => {
    const embeddings = await openai.embeddings.create({
        input: text,
        model: 'text-embedding-ada-002',
    });
    console.log(embeddings);

    return embeddings.data[0].embedding;
};

//////////////////
// SEARCH  //
//////////////////

const search = async (query) => {
    const results = await index.query({
        vector: query,
        topK: 5,
    });

    console.log(results);

    return results;
};

const loadBookByName = async (bookName) => {
    // Adjust the file name as necessary (e.g., remove spaces or match your naming convention)
    const fileName = bookName.replace(/\s/g, '') + '.json';
    const filePath = path.resolve(__dirname, `./Bible-kjv/${fileName}`);
    try {
        const bookData = await fs.readFile(filePath, 'utf8');
        return JSON.parse(bookData);
    } catch (error) {
        console.error(`Error loading book ${bookName}:`, error);
        return null;
    }
};

const returnVerses = async (results) => {
    const verses = [];

    for (const result of results) {
        const [bookName, chapterNumber, verseNumber] = result.id.split('-');
        const book = await loadBookByName(bookName);
        if (!book) continue; // Skip if the book could not be loaded

        const chapter = book.chapters[parseInt(chapterNumber, 10) - 1];
        const verse = chapter.verses.find((v) => v.verse === verseNumber);

        if (chapter && verse) {
            verses.push({
                book: bookName,
                chapter: chapterNumber,
                verse: verseNumber,
                text: verse.text,
            });
        }
    }

    return verses;
};

const searchTheBible = async (query) => {
    const queryEmbedding = await getEmbedding(query);
    const results = await search(queryEmbedding); // Assuming this returns something like { matches: [...] }

    // Adjusted to await the asynchronous returnVerses function
    const verses = await returnVerses(results.matches);

    return verses;
};
