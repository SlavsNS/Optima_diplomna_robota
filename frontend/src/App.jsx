import { useState, useEffect } from 'react';
import DocumentForm from './components/DocumentForm';
import AuthForms from './components/AuthForms';

import zayava from './config/zayava.json';
import advZapyt from './config/adv_zapyt.json';
import publinf from './config/publinf.json';
import klopotannya from './config/court/klopotannya.json';
import pozovna from './config/court/pozovna.json';

const DOC_GROUPS = [
    {
        title: "Загальні документи",
        items: [
            { config: zayava,      icon: '📄' },
            { config: advZapyt,    icon: '🔍' },
            { config: publinf,     icon: '🗂️' }
        ]
    },
    {
        title: "Судові документи (ЄСІТС)",
        items: [
            { config: pozovna,     icon: '⚖️' },
            { config: klopotannya, icon: '📁' }
        ]
    }
];

export default function App() {
    const [activeItem, setActiveItem] = useState(DOC_GROUPS[0].items[0]);
    const [user, setUser] = useState(null);
    const [history, setHistory] = useState([]);

    // Перевірка збереженої сесії при першому завантаженні
    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
    }, []);

    // Завантаження історії при зміні користувача
    useEffect(() => {
        if (user) {
            fetchHistory();
        }
    }, [user]);

    const fetchHistory = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch('/api/documents/history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (err) {
            console.error("Помилка завантаження історії:", err);
        }
    };

    // Функція для повторного завантаження з архіву
    const handleDownloadHistoryItem = async (doc) => {
        try {
            const parsedData = JSON.parse(doc.form_data);
            console.log("Крок 1: Дані з БД:", parsedData);

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: doc.doc_type,
                    data: parsedData
                }),
            });

            console.log("Крок 2: Сервер відповів успішно");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.download = `${doc.doc_label}_(архів).pdf`;
            a.href = url;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Крок 3: Помилка:", err);
            alert('Помилка: ' + err.message);
        }
    };

    // Функція для видалення документа з архіву
    const handleDeleteHistoryItem = async (id) => {
        if (!window.confirm("Ви дійсно хочете видалити цей документ з архіву?")) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/documents/history/${id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setHistory(prevHistory => prevHistory.filter(doc => doc.id !== id));
            } else {
                const errData = await response.json();
                alert(`Помилка: ${errData.error || 'Не вдалося видалити'}`);
            }
        } catch (error) {
            console.error("Помилка при видаленні:", error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setHistory([]);
    };

    return (
        <div className="app">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <h1>⚖️ LexDocs</h1>
                    <p>Генератор юридичних документів</p>
                </div>

                {DOC_GROUPS.map((group, groupIndex) => (
                    <div key={groupIndex} style={{ marginBottom: '10px' }}>
                        <div className="sidebar-section">{group.title}</div>
                        {group.items.map((item) => (
                            <button
                                key={item.config.type}
                                className={`doc-type-btn ${activeItem.config.type === item.config.type ? 'active' : ''}`}
                                onClick={() => setActiveItem(item)}
                            >
                                <span className="icon">{item.icon}</span>
                                <span>{item.config.label}</span>
                            </button>
                        ))}
                    </div>
                ))}

                {user && (
                    <div style={{ marginTop: '15px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                        <div className="sidebar-section">Останні згенеровані</div>
                        <div style={{ padding: '0 12px', maxHeight: '140px', overflowY: 'auto', fontSize: '12px' }}>
                            {history.length === 0 ? (
                                <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '5px 0' }}>Історія порожня</div>
                            ) : (
                                history.map(doc => (
                                    <div
                                        key={doc.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '8px 5px', borderBottom: '1px dashed var(--border)',
                                            transition: 'background 0.2s', color: 'var(--accent)'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = '#e8f0fb'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        {/* Ліва частина - клікабельна для скачування */}
                                        <div 
                                            onClick={() => handleDownloadHistoryItem(doc)} 
                                            style={{ cursor: 'pointer', flex: 1 }}
                                            title="Завантажити цей документ ще раз"
                                        >
                                            <div style={{ fontWeight: '500' }}>🔹 {doc.doc_label}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                                                {new Date(doc.created_at).toLocaleDateString('uk-UA')} {new Date(doc.created_at).toLocaleTimeString('uk-UA', {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                        
                                        {/* Права частина - кнопка видалення */}
                                        <button 
                                            onClick={() => handleDeleteHistoryItem(doc.id)}
                                            style={{ 
                                                background: 'none', border: 'none', cursor: 'pointer', 
                                                padding: '5px', fontSize: '14px', opacity: 0.7 
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                                            onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
                                            title="Видалити документ"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                <div className="sidebar-footer" style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '15px' }}>
                    {user ? (
                        <div>
                            <div style={{ fontWeight: 'bold', color: 'var(--text)' }}>👤 {user.name}</div>
                            <button onClick={handleLogout} style={{ marginTop: '8px', color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: 0 }}>
                                🚪 Вийти з кабінету
                            </button>
                        </div>
                    ) : (
                        <div style={{ marginBottom: '10px', fontWeight: '500', color: 'var(--accent)' }}>Вхід не виконано</div>
                    )}
                </div>
            </aside>

            <main className="main">
                <div className="topbar">
                    <div>
                        <h2>{activeItem.icon} {activeItem.config.label}</h2>
                        <p>{activeItem.config.description}</p>
                    </div>
                    <span className="dstu-badge">✓ ДСТУ 4163:2020</span>
                </div>

                <div className="content">
                    {user ? (
                        <DocumentForm
                            key={activeItem.config.type}
                            config={activeItem.config}
                            onDocumentGenerated={fetchHistory}
                        />
                    ) : (
                        <AuthForms onLoginSuccess={(userData) => setUser(userData)} />
                    )}
                </div>
            </main>
        </div>
    );
}