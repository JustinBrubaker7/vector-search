const express = require('express');
const port = 8080;
const path = require('path');
const OpenAI = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');

const fs = require('fs').promises;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger-output.json');

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


app.use('/', require('./routes/internal'));
app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use('/search', require('./routes/external'));
