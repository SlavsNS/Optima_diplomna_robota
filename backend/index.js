const express = require('express');
const cors = require('cors');
const generateRoute = require('./routes/generate');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/generate', generateRoute);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'LexDocs backend running' });
});

app.listen(PORT, () => {
    console.log(`LexDocs backend running on http://localhost:${PORT}`);
});