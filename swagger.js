const swaggerAutogen = require('swagger-autogen')();

const doc = {
    info: {
        title: 'Semantic Search - Bible Vector Search API',
        description: 'This is a simple API for searching the Bible using semantic search.',
    },
    host: 'localhost:8080/search',
};

const outputFile = './swagger-output.json';
const routes = ['./routes/external.js'];

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

swaggerAutogen(outputFile, routes, doc).then(() => {
    require('./server.js');
});
