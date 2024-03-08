const express = require('express');
const port = 8080;
const path = require('path');
const OpenAI = require('openai');
const https = require('https');
const fs = require('fs');

const { Pinecone } = require('@pinecone-database/pinecone');

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

if (process.env.NODE_ENV === 'production') {
    // Production server setup...
    app.listen(8080); // Example for production, adjust as needed
} else {
    // Local development with HTTPS
    https
        .createServer(
            {
                key: fs.readFileSync('./security/key.pem'),
                cert: fs.readFileSync('./security/cert.pem'),
            },
            app
        )
        .listen(8080, function () {
            console.log('HTTPS server running on port 8080');
        });
}

// server the assets folder in the public directory
app.use(express.static('public'));

app.use('/', require('./routes/internal'));
app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use('/search', require('./routes/external'));
