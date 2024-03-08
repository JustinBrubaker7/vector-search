const swaggerAutogen = require('swagger-autogen')();

const doc = {
    info: {
        title: 'Semantic Search - Bible Vector Search API',
        description: 'This is a simple API for searching the Bible using semantic search.',
    },
    // Dynamically set the host based on the environment
    host: 'vector.justinbrubaker.dev/search',
    schemes: ['https'], // Ensure HTTPS is used, especially for production
};

const outputFile = './swagger-output.json';
const routes = ['./routes/external.js'];

swaggerAutogen(outputFile, routes, doc).then(() => {
    require('./server.js'); // Make sure this is the entry point of your application
});
