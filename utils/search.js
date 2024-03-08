const path = require('path');
const OpenAI = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');
const fs = require('fs').promises;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
});

const namespace = 'bible-search';
const index = pinecone.index(namespace);

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
    // Use the environment variable or default to './Bible' if it's not set
    const bibleJsonPath = process.env.BIBLE_JSON_PATH || './Bible';

    // Adjust the file name as necessary (e.g., remove spaces or match your naming convention)
    const fileName = bookName.replace(/\s/g, '') + '.json';
    const filePath = path.resolve(__dirname, `../${bibleJsonPath}/${fileName}`);
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

module.exports = {
    searchTheBible,
};
