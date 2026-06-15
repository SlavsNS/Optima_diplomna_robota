const express = require('express');
const cors = require('cors');
const generateRoute = require('./routes/generate');
const app = express();
const PORT = process.env.PORT || 3001;

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/generate', generateRoute);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'LexDocs backend running' });
});

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const documentsRoutes = require('./routes/documents');
app.use('/api/documents', documentsRoutes);

// --- ШІ-Асистент для документів ---
app.post('/api/ai-draft', async (req, res) => {
    try {
        const { fieldName, prompt } = req.body;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const aiPrompt = `Ти — висококваліфікований український юрист. Твоє завдання — написати офіційний юридичний текст для поля "${fieldName}" у судовому документі.
Ситуація клієнта: ${prompt}

Вимоги:
1. Тільки українською мовою.
2. Суворий діловий та юридичний стиль (ДСТУ, канцеляризми).
3. Якщо можливо, додай посилання на релевантні статті ЦПК/КПК/КАС України.
4. ОДРАЗУ видавай готовий текст. Жодних привітань, пояснень чи фраз "Ось ваш текст".`;

        const result = await model.generateContent(aiPrompt);
        res.json({ text: result.response.text().trim() });
    } catch (error) {
        console.error("Помилка ШІ:", error);
        res.status(500).json({ error: 'Не вдалося згенерувати текст: ' + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`LexDocs backend running on http://localhost:${PORT}`);
});