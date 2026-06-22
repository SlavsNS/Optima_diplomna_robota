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
        const { fieldName, prompt, docType, docLabel } = req.body;
        console.log('docType:', docType, '| docLabel:', docLabel); // ← сюди

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const docDescriptions = {
            'zayava': `звичайна заява-звернення громадянина керівнику організації або органу влади.
ПРИКЛАД правильного тексту: "Прошу надати мені відпустку без збереження заробітної плати тривалістю 5 календарних днів з 01.07.2026 у зв'язку з сімейними обставинами."
Текст починається з "Прошу..." або "Звертаюсь з проханням...". Короткий, простий. БЕЗ слів: суд, клопотання, провадження, позивач, ЦПК, КПК, КАС.`,
            'klopotannya': `процесуальне клопотання до суду. Використовуй ЦПК/КАС/КПК та судову термінологію.`,
            'adv_zapyt': `адвокатський запит відповідно до ст. 24 ЗУ "Про адвокатуру". Офіційний стиль.`,
            'publinf': `запит на публічну інформацію відповідно до ЗУ "Про доступ до публічної інформації".`,
        };

        const docDescription = docDescriptions[docType] || docLabel;

        const aiPrompt = `Ти — український юрист. Напиши текст для поля "${fieldName}".

ТИП ДОКУМЕНТА: ${docDescription}

Ситуація: ${prompt}

Правила:
- Тільки українська мова
- Стиль відповідно до типу документа
- ОДРАЗУ готовий текст, без пояснень`;

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

