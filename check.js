require('dotenv').config();
const { chromium } = require('playwright');
const nodemailer = require('nodemailer');

const TARGET_URL = process.env.TARGET_URL;
const PORTAL_USER = process.env.PORTAL_USER || '';
const PORTAL_PASSWORD = process.env.PORTAL_PASSWORD || '';
const TIMEZONE = process.env.TIMEZONE || 'America/Guayaquil';

const UNAVAILABLE_KEYWORDS = (process.env.UNAVAILABLE_KEYWORDS || '')
  .split(',')
  .map((word) => word.trim().toLowerCase())
  .filter(Boolean);

const USES_PASSWORD = PORTAL_PASSWORD.length > 0;

const USERNAME_SELECTOR =
  process.env.USERNAME_SELECTOR ||
  'input[type="text"], input[type="number"], input[type="tel"], input[type="email"], ' +
    'input[name*="cedula" i], input[id*="cedula" i], input[placeholder*="cedula" i], input[placeholder*="cédula" i], ' +
    'input[name*="user" i], input[id*="user" i]';
const PASSWORD_SELECTOR = process.env.PASSWORD_SELECTOR || 'input[type="password"]';
const SUBMIT_SELECTOR =
  process.env.SUBMIT_SELECTOR ||
  'button[type="submit"], input[type="submit"], button:has-text("Ingresar"), button:has-text("Entrar"), ' +
    'button:has-text("Iniciar"), button:has-text("Consultar"), button:has-text("Buscar")';

if (!TARGET_URL) {
  console.error('Falta TARGET_URL en el archivo .env');
  process.exit(1);
}

async function checkSite() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();

  try {
    const response = await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);

    if (!response || !response.ok()) {
      return { available: false, reason: 'La pagina respondio con un error al abrirla.' };
    }

    const pageText = (await page.evaluate(() => document.body.innerText || '')).toLowerCase();
    const hasBlockedKeyword = UNAVAILABLE_KEYWORDS.some((word) => pageText.includes(word));
    if (hasBlockedKeyword) {
      return { available: false, reason: 'La pagina sigue mostrando el aviso de que no esta disponible.' };
    }

    const mainField = page.locator(USERNAME_SELECTOR).first();
    const hasForm = (await mainField.count()) > 0;
    if (!hasForm) {
      return { available: false, reason: 'Todavia no aparece el campo para escribir la cedula.' };
    }

    try {
      await mainField.fill(PORTAL_USER);
      if (USES_PASSWORD) {
        const passwordField = page.locator(PASSWORD_SELECTOR).first();
        if ((await passwordField.count()) > 0) {
          await passwordField.fill(PORTAL_PASSWORD);
        }
      }
      await page.locator(SUBMIT_SELECTOR).first().click();
      await page.waitForTimeout(4000);
    } catch (loginError) {
      const screenshot = await page.screenshot({ fullPage: true });
      return {
        available: true,
        loginOk: false,
        reason: `La pagina ya esta abierta, pero no se pudo ingresar solo: ${loginError.message}`,
        screenshot,
      };
    }

    const resultText = await page.evaluate(() => document.body.innerText || '');
    const screenshot = await page.screenshot({ fullPage: true });

    return {
      available: true,
      loginOk: true,
      reason: 'La pagina ya esta funcionando y se pudo ingresar con tu usuario.',
      resultText,
      screenshot,
    };
  } catch (error) {
    return { available: false, reason: `No se pudo abrir la pagina: ${error.message}` };
  } finally {
    await browser.close();
  }
}

async function sendEmail({ subject, text, screenshot }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.NOTIFY_EMAIL || process.env.GMAIL_USER,
    subject,
    text,
    attachments: screenshot ? [{ filename: 'resultado.png', content: screenshot }] : [],
  });
}

(async () => {
  const result = await checkSite();
  const now = new Date().toLocaleString('es-EC', { timeZone: TIMEZONE });

  if (result.available && result.loginOk) {
    await sendEmail({
      subject: 'Ya funciona la pagina: se ingreso con tu usuario',
      text: `${result.reason}\n\nFecha: ${now}\nPagina: ${TARGET_URL}\n\nTexto que se ve en la pagina despues de ingresar:\n${(result.resultText || '').slice(0, 1500)}`,
      screenshot: result.screenshot,
    });
    console.log('Disponible. Se envio el correo con el resultado.');
  } else if (result.available && !result.loginOk) {
    await sendEmail({
      subject: 'La pagina ya abrio, pero revisa el ingreso',
      text: `${result.reason}\n\nFecha: ${now}\nPagina: ${TARGET_URL}`,
      screenshot: result.screenshot,
    });
    console.log('Disponible, pero fallo el ingreso automatico. Se envio correo.');
  } else {
    await sendEmail({
      subject: 'Todavia no funciona la pagina',
      text: `${result.reason}\n\nFecha: ${now}\nPagina: ${TARGET_URL}`,
    });
    console.log('No disponible todavia. Se envio correo.');
  }
})();
