const express = require('express');
const port = 3000;
const path = require('path');
const OpenAI = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');
const BookOfJohn = require('./Bible-kjv/John.json');

const fs = require('fs').promises;

const app = express();

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

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

const getEmbedding = async (text) => {
    const embeddings = await openai.embeddings.create({
        input: text,
        model: 'text-embedding-ada-002',
    });
    console.log(embeddings);

    return embeddings.data[0].embedding;
};

const getEmbeddingsBatch = async (texts) => {
    const embeddingsResponse = await openai.embeddings.create({
        input: texts, // 'texts' is now an array of strings
        model: 'text-embedding-ada-002',
    });
    return embeddingsResponse.data.map((data) => data.embedding);
};

const embedTheEntireBibleBatch = async () => {
    const booksFile = path.resolve(__dirname, './Bible-kjv/Books.json');
    const books = await fs.readFile(booksFile, 'utf8').then(JSON.parse);

    for (const bookName of books) {
        console.log(`Embedding ${bookName}...`);
        const bookFile = path.resolve(__dirname, `./Bible-kjv/${bookName}.json`);
        const book = await fs.readFile(bookFile, 'utf8').then(JSON.parse);

        for (const chapter of book.chapters) {
            let batchTexts = [];
            let batchIds = [];

            for (const verse of chapter.verses) {
                batchTexts.push(verse.text);
                batchIds.push(`${bookName}-${chapter.chapter}-${verse.verse}`);

                if (batchTexts.length >= 20) {
                    // Adjust based on API limits and performance testing
                    const embeddings = await getEmbeddingsBatch(batchTexts);
                    const data = embeddings.map((embedding, index) => ({
                        id: batchIds[index],
                        values: embedding,
                    }));

                    await index.upsert(data);

                    // Reset batch
                    batchTexts = [];
                    batchIds = [];
                }
            }

            // Handle any remaining items in the batch for the chapter
            if (batchTexts.length > 0) {
                const embeddings = await getEmbeddingsBatch(batchTexts);
                const data = embeddings.map((embedding, index) => ({
                    id: batchIds[index],
                    values: embedding,
                }));

                await index.upsert(data);
            }

            // Log completion of the chapter after processing all verses in it
            console.log(`Embedding of ${bookName} chapter ${chapter.chapter} complete.`);
        }
    }
    console.log('Batch embedding of the entire Bible complete.');
};

//////////////////
// SEARCH  //
//////////////////

const returnVerses = async (results) => {
    const verses = [];

    for (const result of results) {
        const id = result.id;
        const chapterNumber = id.split('-')[0];
        const verseNumber = id.split('-')[1];

        const chapter = BookOfJohn.chapters[chapterNumber - 1];
        const verse = chapter.verses[verseNumber - 1];

        verses.push({
            chapter: chapterNumber,
            verse: verseNumber,
            text: verse.text,
        });
    }

    return verses;
};

const search = async (query) => {
    const results = await index.query({
        vector: query,
        topK: 5,
    });

    console.log(results);

    return results;
};

const searchTheBookOfJohn = async (query) => {
    // get embeddings for query
    const queryEmbedding = await getEmbedding(query);

    // search for similar embeddings
    const results = await search(queryEmbedding);

    // return verses
    const verses = await returnVerses(results.matches);

    console.log(verses);
};

// searchTheBookOfJohn('jesus wept');
