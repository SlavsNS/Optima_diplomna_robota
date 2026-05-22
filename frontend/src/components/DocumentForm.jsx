import { useForm } from 'react-hook-form'
import { useState } from 'react'

export default function DocumentForm({ config }) {
    const { register, handleSubmit, reset, formState: { errors } } = useForm()
    const [status, setStatus] = useState(null) // null | 'loading' | 'success' | 'error'
    const [errorMsg, setErrorMsg] = useState('')

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
        } catch (err) {
            setStatus('error')
            setErrorMsg(err.message)
        }
    }

    const handleReset = () => {
        reset()
        setStatus(null)
        setErrorMsg('')
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
                                    <textarea
                                        id={field.name}
                                        placeholder={field.placeholder}
                                        className={errors[field.name] ? 'error' : ''}
                                        {...register(field.name, {
                                            required: field.required ? 'Обов\'язкове поле' : false,
                                        })}
                                    />
                                ) : field.type === 'select' ? (
                                    <select
                                        id={field.name}
                                        className={errors[field.name] ? 'error' : ''}
                                        {...register(field.name, {
                                            required: field.required ? 'Обов\'язкове поле' : false,
                                        })}
                                    >
                                        <option value="">— оберіть —</option>
                                        {field.options.map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
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
                <button type="submit" className="btn-primary" disabled={status === 'loading'}>
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