import { useState } from 'react'
import DocumentForm from './components/DocumentForm'
import zayava from './config/zayava.json'
import klopotannya from './config/klopotannya.json'
import advZapyt from './config/adv_zapyt.json'
import publinf from './config/publinf.json'

const DOC_TYPES = [
    { config: zayava,      icon: '📄', color: '#1a56a0' },
    { config: klopotannya, icon: '⚖️', color: '#1a7a4a' },
    { config: advZapyt,    icon: '🔍', color: '#7a4a1a' },
    { config: publinf,     icon: '🗂️', color: '#4a1a7a' },
]

export default function App() {
    const [activeIdx, setActiveIdx] = useState(0)
    const active = DOC_TYPES[activeIdx]

    return (
        <div className="app">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <h1>⚖️ LexDocs</h1>
                    <p>Генератор юридичних документів</p>
                </div>

                <div className="sidebar-section">Типи документів</div>

                {DOC_TYPES.map((dt, i) => (
                    <button
                        key={dt.config.type}
                        className={`doc-type-btn ${activeIdx === i ? 'active' : ''}`}
                        onClick={() => setActiveIdx(i)}
                    >
                        <span className="icon">{dt.icon}</span>
                        <span>{dt.config.label}</span>
                    </button>
                ))}

                <div className="sidebar-footer">
                    Документи формуються згідно з<br />
                    <strong>ДСТУ 4163:2020</strong><br />
                    і є юридично коректними.
                </div>
            </aside>

            {/* Main */}
            <main className="main">
                <div className="topbar">
                    <div>
                        <h2>{active.icon} {active.config.label}</h2>
                        <p>{active.config.description}</p>
                    </div>
                    <span className="dstu-badge">✓ ДСТУ 4163:2020</span>
                </div>

                <div className="content">
                    <DocumentForm key={active.config.type} config={active.config} />
                </div>
            </main>
        </div>
    )
}