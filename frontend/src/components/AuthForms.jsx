import { useState } from 'react';

export default function AuthForms({ onLoginSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const url = isLogin ? '/api/auth/login' : '/api/auth/register';

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Помилка');

            if (isLogin) {
                // Зберігаємо токен і дані юзера
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                onLoginSuccess(data.user);
            } else {
                // Після успішної реєстрації перемикаємо на логін
                setIsLogin(true);
                setError('Реєстрація успішна! Тепер увійдіть.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center', color: '#1a56a0', marginBottom: '20px' }}>
                {isLogin ? 'Вхід в кабінет' : 'Реєстрація'}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {!isLogin && (
                    <input
                        type="text"
                        placeholder="Ваше ПІБ"
                        required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                )}
                <input
                    type="email"
                    placeholder="Електронна пошта"
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <input
                    type="password"
                    placeholder="Пароль"
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                />

                {error && <p style={{ color: error.includes('успішна') ? 'green' : 'red', fontSize: '14px', margin: 0 }}>{error}</p>}

                <button type="submit" disabled={loading} style={{ padding: '10px', background: '#1a56a0', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {loading ? 'Зачекайте...' : (isLogin ? 'Увійти' : 'Зареєструватися')}
                </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>
                {isLogin ? 'Немає акаунту? ' : 'Вже є акаунт? '}
                <button
                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    style={{ background: 'none', border: 'none', color: '#1a56a0', textDecoration: 'underline', cursor: 'pointer' }}
                >
                    {isLogin ? 'Зареєструватися' : 'Увійти'}
                </button>
            </p>
        </div>
    );
}