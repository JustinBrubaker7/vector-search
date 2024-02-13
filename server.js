const express = require('express');
const port = 3000;
const path = require('path');
const OpenAI = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');
const BookOfJohn = require('./Bible-kjv/John.json');

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

const embedTheBookOfJohn = async () => {
    for (const chapter of BookOfJohn.chapters) {
        for (const verse of chapter.verses) {
            const text = verse.text;
            const embedding = await getEmbedding(text);

            // Using chapter and verse number as ID
            const id = `${chapter.chapter}-${verse.verse}`;

            // Send embeddings to Pinecone
            const data = {
                id: id,
                values: embedding,
            };

            await index.upsert([data]);
        }
    }
    console.log('Embedding of the Book of John complete.');
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
