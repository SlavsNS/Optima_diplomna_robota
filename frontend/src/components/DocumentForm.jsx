import { useForm } from 'react-hook-form'
import { useState } from 'react'

export default function DocumentForm({ config, onDocumentGenerated }) {
    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()
    const [status, setStatus] = useState(null)
    const [errorMsg, setErrorMsg] = useState('')

    // Стейт для ШІ
    const [aiField, setAiField] = useState(null)
    const [aiPrompt, setAiPrompt] = useState('')
    const [isAiLoading, setIsAiLoading] = useState(false)

    const onSubmit = async (formData) => {
        setStatus('loading')
        setErrorMsg('')
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: config.type, data: formData }),
            })

            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || 'Помилка сервера')
            }

            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            const disposition = response.headers.get('Content-Disposition') || ''
            const match = disposition.match(/filename\*=UTF-8''(.+)/)
            a.download = match ? decodeURIComponent(match[1]) : `${config.label}.pdf`
            a.href = url
            a.click()
            URL.revokeObjectURL(url)
            setStatus('success')

            // Збереження в історію разом із даними форми (formData)
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    await fetch('/api/documents/history', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            doc_type: config.type,
                            doc_label: config.label,
                            form_data: JSON.stringify(formData) // Зберігаємо всі дані форми
                        })
                    });

                    if (onDocumentGenerated) {
                        onDocumentGenerated();
                    }
                } catch (e) {
                    console.error("Не вдалося зберегти док в історію", e);
                }
            }
        } catch (err) {
            setStatus('error')
            setErrorMsg(err.message)
        }
    }

    const handleReset = () => {
        reset()
        setStatus(null)
        setErrorMsg('')
        setAiField(null)
    }

    const handleGenerateAi = async (fieldName, fieldLabel) => {
        if (!aiPrompt.trim()) return;

        setIsAiLoading(true);
        try {
            const response = await fetch('/api/ai-draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fieldName: fieldLabel, prompt: aiPrompt }),
            });

            if (!response.ok) throw new Error('ШІ не зміг згенерувати текст');

            const data = await response.json();
            setValue(fieldName, data.text);
            setAiField(null);
            setAiPrompt('');
        } catch (err) {
            alert('Помилка ШІ: ' + err.message);
        } finally {
            setIsAiLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="info-box">
                <strong>Правова підстава:</strong> {config.law}
            </div>

            {config.sections.map((section) => (
                <div key={section.title}>
                    <div className="section-title">{section.title}</div>
                    <div className="form-grid">
                        {section.fields.map((field) => (
                            <div
                                key={field.name}
                                className={`form-group ${field.type === 'textarea' ? 'full' : ''}`}
                            >
                                <label htmlFor={field.name}>
                                    {field.label}
                                    {field.required && <span className="required">*</span>}
                                </label>

                                {field.type === 'textarea' ? (
                                    <div className="textarea-wrapper">
                                        <textarea
                                            id={field.name}
                                            placeholder={field.placeholder}
                                            rows={12}
                                            style={{ resize: 'vertical', minHeight: '250px' }}
                                            className={errors[field.name] ? 'error' : ''}
                                            {...register(field.name, {
                                                required: field.required ? 'Обов\'язкове поле' : false,
                                            })}
                                        />

                                        <div className="ai-controls" style={{ marginTop: '8px' }}>
                                            {aiField !== field.name ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setAiField(field.name)}
                                                    style={{ background: 'none', border: '1px dashed #8e24aa', color: '#8e24aa', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85em', width: '100%', textAlign: 'left' }}
                                                >
                                                    ✨ Згенерувати юридичний текст за допомогою ШІ
                                                </button>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '5px', alignItems: 'center' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Опишіть ситуацію своїми словами..."
                                                        value={aiPrompt}
                                                        onChange={(e) => setAiPrompt(e.target.value)}
                                                        style={{ flex: 1, padding: '8px', border: '1px solid #8e24aa', borderRadius: '4px' }}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleGenerateAi(field.name, field.label); } }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleGenerateAi(field.name, field.label)}
                                                        disabled={isAiLoading}
                                                        style={{ backgroundColor: '#8e24aa', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                                    >
                                                        {isAiLoading ? '⏳...' : '🚀'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAiField(null)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em' }}
                                                        title="Закрити"
                                                    >
                                                        ❌
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : field.type === 'select' ? (
                                    <select
                                        id={field.name}
                                        className={errors[field.name] ? 'error' : ''}
                                        {...register(field.name, {
                                            required: field.required ? 'Обов\'язкове поле' : false,
                                        })}
                                    >
                                        <option value="">— оберіть —</option>
                                        {field.options?.map((opt, idx) => {
                                            const val = typeof opt === 'object' ? opt.value : opt;
                                            const lbl = typeof opt === 'object' ? opt.label : opt;
                                            return <option key={idx} value={val}>{lbl}</option>;
                                        })}
                                    </select>
                                ) : field.type === 'date' ? (
                                    <input
                                        id={field.name}
                                        type="date"
                                        className={errors[field.name] ? 'error' : ''}
                                        {...register(field.name, {
                                            required: field.required ? 'Обов\'язкове поле' : false,
                                        })}
                                    />
                                ) : (
                                    <input
                                        id={field.name}
                                        type="text"
                                        placeholder={field.placeholder}
                                        className={errors[field.name] ? 'error' : ''}
                                        {...register(field.name, {
                                            required: field.required ? 'Обов\'язкове поле' : false,
                                            validate: field.name === 'zayavnyk_ipn'
                                                ? v => !v || /^\d{10}$/.test(v) || 'ІПН має містити 10 цифр'
                                                : undefined,
                                        })}
                                    />
                                )}

                                {errors[field.name] && (
                                    <span className="err-msg">{errors[field.name].message}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            <div className="actions">
                <button type="submit" className="btn-primary" disabled={status === 'loading' || isAiLoading}>
                    {status === 'loading' ? '⏳ Генерація...' : '⬇️ Згенерувати PDF'}
                </button>
                <button type="button" className="btn-secondary" onClick={handleReset}>
                    Очистити
                </button>
            </div>

            {status === 'loading' && (
                <div className="status-msg loading">⏳ Формуємо документ відповідно до ДСТУ 4163:2020...</div>
            )}
            {status === 'success' && (
                <div className="status-msg success">✅ Документ успішно згенеровано і завантажено!</div>
            )}
            {status === 'error' && (
                <div className="status-msg error">❌ {errorMsg}</div>
            )}
        </form>
    )
}