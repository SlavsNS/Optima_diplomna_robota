const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const router = express.Router();
// Секретний ключ для сесій (краще потім перенести в .env)
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-lexdocs-key';

// 1. РЕЄСТРАЦІЯ
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Заповніть всі поля' });
    }

    try {
        // Шифруємо пароль
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Зберігаємо в БД
        const sql = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;
        db.run(sql, [name, email, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Користувач з таким email вже існує' });
                }
                return res.status(500).json({ error: 'Помилка БД' });
            }
            res.status(201).json({ message: 'Реєстрація успішна!', userId: this.lastID });
        });
    } catch (error) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// 2. ЛОГІН (ВХІД)
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Помилка БД' });
        if (!user) return res.status(400).json({ error: 'Користувача не знайдено' });

        // Перевіряємо пароль
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Невірний пароль' });

        // Створюємо токен на 24 години
        const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ message: 'Успішний вхід', token, user: { name: user.name, email: user.email } });
    });
});

module.exports = router;