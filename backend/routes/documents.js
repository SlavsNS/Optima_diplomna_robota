const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-lexdocs-key';

// Мідлвар для перевірки токена
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Неавторизовано' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Токен застарів або недійсний' });
        req.user = user;
        next();
    });
};

// 1. ОТРИМАТИ ІСТОРІЮ (з коректною обробкою form_data)
router.get('/history', authenticateToken, (req, res) => {
    const sql = `SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC`;
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) {
            console.error("Помилка БД при читанні:", err);
            return res.status(500).json({ error: 'Помилка отримання історії' });
        }

        // Повертаємо дані, гарантуючи, що form_data - це валідний JSON
        res.json(rows.map(row => ({
            ...row,
            form_data: row.form_data || "{}"
        })));
    });
});

// 2. ДОДАТИ ДОКУМЕНТ В ІСТОРІЮ
router.post('/history', authenticateToken, (req, res) => {
    const { doc_type, doc_label, form_data } = req.body;

    // Перевірка наявності необхідних даних
    if (!doc_type || !doc_label || !form_data) {
        return res.status(400).json({ error: 'Неповні дані для збереження запису' });
    }

    const sql = `INSERT INTO documents (user_id, doc_type, doc_label, form_data) VALUES (?, ?, ?, ?)`;
    db.run(sql, [req.user.id, doc_type, doc_label, form_data], function(err) {
        if (err) {
            console.error("Помилка запису в БД:", err);
            return res.status(500).json({ error: 'Помилка запису в БД' });
        }
        res.status(201).json({ success: true, docId: this.lastID });
    });
});

router.get('/check-db', (req, res) => {
    db.all("PRAGMA table_info(documents)", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows); // Це покаже всі колонки (id, user_id, doc_type, doc_label, form_data)
    });
});

// 3. ВИДАЛИТИ ДОКУМЕНТ З ІСТОРІЇ
router.delete('/history/:id', authenticateToken, (req, res) => {
    const docId = req.params.id;
    const userId = req.user.id; // Беремо ID юзера з токена для безпеки

    // Видаляємо лише той документ, який належить поточному авторизованому юзеру
    const sql = `DELETE FROM documents WHERE id = ? AND user_id = ?`;
    
    db.run(sql, [docId, userId], function(err) {
        if (err) {
            console.error("Помилка БД при видаленні:", err);
            return res.status(500).json({ error: 'Помилка видалення документа з бази' });
        }
        
        // this.changes показує, скільки рядків було видалено.
        // Якщо 0, значить документа з таким ID немає, або він належить іншому користувачу.
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Документ не знайдено або у вас немає прав на його видалення' });
        }
        
        res.status(200).json({ success: true, message: 'Документ успішно видалено', id: docId });
    });
});

module.exports = router;