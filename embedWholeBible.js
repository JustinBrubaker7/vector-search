const getEmbeddingsBatch = async (texts) => {
    const embeddingsResponse = await openai.embeddings.create({
        input: texts, // 'texts' is now an array of strings
        model: 'text-embedding-ada-002',
    });
    return embeddingsResponse.data.map((data) => data.embedding);
};

const embedTheEntireBibleBatch = async () => {
    const booksFile = path.resolve(__dirname, './Bible/Books.json');
    const books = await fs.readFile(booksFile, 'utf8').then(JSON.parse);

    for (const bookName of books) {
        console.log(`Embedding ${bookName}...`);
        const bookFile = path.resolve(__dirname, `./Bible/${bookName}.json`);
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
