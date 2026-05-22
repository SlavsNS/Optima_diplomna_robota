const express = require('express');
const router = express.Router();
const path = require('path');
const puppeteer = require('puppeteer');

const REQUIRED_FIELDS = {
    zayava:    ['adresat_posada', 'adresat_organ', 'zayavnyk_pib_rod', 'zayavnyk_pib', 'zayavnyk_adresa', 'tekst', 'data'],
    klopotannya: ['sud_nazva', 'sprava_nomer', 'zayavnyk_pib', 'zayavnyk_status', 'tekst', 'data'],
    adv_zapyt: ['adresat_posada', 'adresat_organ', 'advokat_pib', 'advokat_svid', 'klient_pib', 'tekst', 'data'],
    publinf:   ['adresat_posada', 'adresat_organ', 'zayavnyk_pib_rod', 'zayavnyk_pib', 'zayavnyk_adresa', 'tekst', 'data', 'sposib_otrymannya'],
};

// --- Функції форматування ---
function formatAddressee(pib) {
    if (!pib) return '';
    const parts = String(pib).trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[1]} ${parts[0].toUpperCase()}`;
    return String(pib).toUpperCase();
}

function formatApplicant(pib) {
    if (!pib) return '';
    const parts = String(pib).trim().split(/\s+/);
    if (parts.length > 0) parts[0] = parts[0].toUpperCase();
    return parts.join(' ');
}

function formatSignature(pib) {
    if (!pib) return '';
    const parts = String(pib).trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[1]} ${parts[0].toUpperCase()}`;
    return String(pib).toUpperCase();
}

function formatParagraphs(text) {
    if (!text) return '';
    return String(text)
        .split(/\r?\n/)
        .filter(p => p.trim() !== '')
        .map(p => `<div class="body-text">${p}</div>`)
        .join('');
}

// Функція для перевертання дати з YYYY-MM-DD у DD.MM.YYYY
function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return String(dateStr);
}

// Розумна збірка рядків шапки (без порожніх дирок)
function buildLines(linesArr) {
    return linesArr.filter(Boolean).join('<br>');
}

function buildHtml(type, data) {
    const fontPath = path.join(__dirname, '../fonts/times.ttf').replace(/\\/g, '/');

    const fontFace = `
    @font-face {
      font-family: 'TimesNew';
      src: url('file://${fontPath}');
    }
  `;

    const baseStyle = `
    <style>
      ${fontFace}
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: 'TimesNew', 'Times New Roman', serif;
        font-size: 14pt;
        line-height: 1.5;
        color: #000;
        overflow-wrap: break-word;
        word-wrap: break-word;
        hyphens: auto; 
      }
      .page { width: 100%; }
      .adresat {
        margin-left: 80mm;
        text-align: left;
        margin-bottom: 5mm;
        line-height: 1.5;
        text-indent: 0 !important;
      }
      .center { 
        text-align: center; 
        font-weight: bold; 
        margin-bottom: 8mm; 
        text-indent: 0 !important; 
      }
      .body-text { 
        text-indent: 12.5mm; 
        text-align: justify; 
        margin-bottom: 0; 
      }
      .no-indent { text-align: justify; margin-bottom: 4mm; text-indent: 0 !important; }
      .bold { font-weight: bold; }
      .underline { text-decoration: underline; }
      .signature { margin-top: 12mm; text-indent: 0 !important; }
      .sig-row { display: flex; justify-content: space-between; align-items: flex-end; }
      .sig-row span { flex: 1; }
      .sig-left { text-align: left; }
      .sig-center { text-align: center; }
      .sig-right { text-align: right; }
    </style>
  `;

    let body = '';
    const formattedTekst = formatParagraphs(data.tekst);

    if (type === 'zayava') {
        body = `
      <div class="adresat">
        ${buildLines([
            data.adresat_posada,
            data.adresat_organ,
            data.adresat_pib ? formatAddressee(data.adresat_pib) : ''
        ])}
      </div>
      <div class="adresat" style="margin-top: 4mm;">
        ${buildLines([
            formatApplicant(data.zayavnyk_pib_rod),
            data.zayavnyk_ipn ? `РНОКПП: ${data.zayavnyk_ipn}` : '',
            data.zayavnyk_adresa ? `Адреса: ${data.zayavnyk_adresa}` : '',
            data.zayavnyk_telefon ? `Телефон: ${data.zayavnyk_telefon}` : '',
            data.zayavnyk_email ? `Ел. пошта: ${data.zayavnyk_email}` : ''
        ])}
      </div>
      <div class="center" style="margin-top: 10mm;">ЗАЯВА</div>
      ${formattedTekst}
      <div class="signature">
        <div class="sig-row">
          <span class="sig-left">${formatDate(data.data)}</span>
          <span class="sig-center">Підпис: КЕП</span>
          <span class="sig-right">${formatSignature(data.zayavnyk_pib)}</span>
        </div>
      </div>
    `;
    } else if (type === 'klopotannya') {
        body = `
      <div class="adresat">
        ${buildLines([data.sud_nazva])}
      </div>
      <div class="adresat" style="margin-top: 4mm;">
        ${buildLines([
            data.zayavnyk_status ? `${data.zayavnyk_status}:` : '',
            formatApplicant(data.zayavnyk_pib),
            data.sprava_nomer ? `Справа № ${data.sprava_nomer}` : ''
        ])}
      </div>
      
      <div class="center" style="margin-top: 10mm; margin-bottom: ${data.pro_scho ? '0' : '8mm'};">КЛОПОТАННЯ</div>
      ${data.pro_scho ? `<div class="center" style="margin-top: 0; margin-bottom: 8mm;">про ${data.pro_scho}</div>` : ''}
      
      ${formattedTekst}
      <div class="no-indent" style="margin-top: 6mm;">На підставі викладеного, керуючись нормами чинного законодавства України,</div>
      <div class="no-indent"><span class="bold">ПРОШУ:</span></div>
      ${formatParagraphs(data.proshu || data.tekst)}
      <div class="signature">
        <div class="sig-row">
          <span class="sig-left">${formatDate(data.data)}</span>
          <span class="sig-center">Підпис: КЕП</span>
          <span class="sig-right">${formatSignature(data.zayavnyk_pib)}</span>
        </div>
      </div>
    `;
    } else if (type === 'adv_zapyt') {
        body = `
      <div class="adresat">
        ${buildLines([
            data.adresat_posada,
            data.adresat_organ,
            data.adresat_pib ? formatAddressee(data.adresat_pib) : ''
        ])}
      </div>
      <div class="adresat" style="margin-top: 4mm;">
        ${buildLines([
            `Адвокат: ${formatApplicant(data.advokat_pib)}`,
            data.advokat_svid ? `Свідоцтво № ${data.advokat_svid}` : '',
            data.advokat_rp ? `Рег. посвідчення № ${data.advokat_rp}` : '',
            data.klient_pib ? `В інтересах: ${formatApplicant(data.klient_pib)}` : ''
        ])}
      </div>
      <div class="center" style="margin-top: 10mm;">АДВОКАТСЬКИЙ ЗАПИТ</div>
      <div class="body-text">Відповідно до статті 24 Закону України «Про адвокатуру та адвокатську діяльність» від 05.07.2012 № 5076-VI, прошу надати наступну інформацію та/або документи:</div>
      ${formattedTekst}
      <div class="signature">
        <div class="sig-row">
          <span class="sig-left">${formatDate(data.data)}</span>
          <span class="sig-center">Підпис: КЕП</span>
          <span class="sig-right">${formatSignature(data.advokat_pib)}</span>
        </div>
      </div>
    `;
    } else if (type === 'publinf') {
        body = `
      <div class="adresat">
        ${buildLines([
            data.adresat_posada,
            data.adresat_organ,
            data.adresat_pib ? formatAddressee(data.adresat_pib) : ''
        ])}
      </div>
      <div class="adresat" style="margin-top: 4mm;">
        ${buildLines([
            formatApplicant(data.zayavnyk_pib_rod),
            data.zayavnyk_adresa ? `Адреса: ${data.zayavnyk_adresa}` : '',
            data.zayavnyk_telefon ? `Телефон: ${data.zayavnyk_telefon}` : '',
            data.zayavnyk_email ? `Ел. пошта: ${data.zayavnyk_email}` : ''
        ])}
      </div>
      <div class="center" style="margin-top: 10mm;">ЗАПИТ НА ОТРИМАННЯ ПУБЛІЧНОЇ ІНФОРМАЦІЇ</div>
      ${formattedTekst}
      <div class="body-text" style="margin-top: 4mm;">Бажаний спосіб отримання відповіді: <span class="underline">${data.sposib_otrymannya || ''}</span>.</div>
      <div class="signature">
        <div class="sig-row">
          <span class="sig-left">${formatDate(data.data)}</span>
          <span class="sig-center">Підпис: КЕП</span>
          <span class="sig-right">${formatSignature(data.zayavnyk_pib)}</span>
        </div>
      </div>
    `;
    }

    return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  ${baseStyle}
</head>
<body>
  <div class="page">
    ${body}
  </div>
</body>
</html>`;
}

router.post('/', async (req, res) => {
    const { type, data } = req.body;

    if (!type || !data) {
        return res.status(400).json({ error: 'Потрібні поля type та data' });
    }

    const required = REQUIRED_FIELDS[type];
    if (!required) {
        return res.status(400).json({ error: `Невідомий тип документа: ${type}` });
    }

    const missing = required.filter(f => !data[f] || String(data[f]).trim() === '');
    if (missing.length > 0) {
        return res.status(400).json({ error: `Відсутні обов'язкові поля: ${missing.join(', ')}` });
    }

    let browser;
    try {
        const html = buildHtml(type, data);

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: { top: '20mm', right: '10mm', bottom: '20mm', left: '30mm' },
            printBackground: true,
        });

        await browser.close();

        const docTypeNames = {
            zayava: 'Заява',
            klopotannya: 'Клопотання',
            adv_zapyt: 'Адвокатський_запит',
            publinf: 'Запит_публінформація',
        };

        const filename = `${docTypeNames[type]}_${data.data || 'документ'}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
        res.send(pdfBuffer);

    } catch (err) {
        if (browser) await browser.close().catch(() => {});
        console.error('Generation error:', err);
        res.status(500).json({ error: 'Помилка генерації документа', details: err.message });
    }
});

module.exports = router;