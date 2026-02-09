import nodemailer from "nodemailer";

export interface MailerData {
  email: string;
  theme: string;
  message: string;
}

const SMTP_USER = process.env.SMTP_USER || "ssezakupshik@yandex.ru";
const SMTP_PASS = process.env.SMTP_PASS || "";

const transporter = nodemailer.createTransport({
  service: "yandex",
  host: process.env.SMTP_HOST || "smtp.yandex.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

/** Экранирует HTML, чтобы в письме не было инъекций и поломанной разметки */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Отправляет письмо.
 * @throws Error при невалидных данных или ошибке SMTP
 */
async function sendMail(data: MailerData): Promise<nodemailer.SentMessageInfo> {
  const email = data?.email?.trim();
  const theme = data?.theme?.trim();
  const message = data?.message;

  if (!email) {
    throw new Error("Mailer: не указан адрес получателя (email)");
  }
  if (!theme) {
    throw new Error("Mailer: не указана тема письма (theme)");
  }
  if (message == null || String(message).trim() === "") {
    throw new Error("Mailer: не указан текст письма (message)");
  }

  if (!SMTP_PASS) {
    console.warn(
      "Mailer: SMTP_PASS не задан. Задайте SMTP_PASS в .env для отправки писем.",
    );
    throw new Error(
      "Mailer: пароль SMTP не настроен (SMTP_PASS). Отправка писем недоступна.",
    );
  }

  try {
    const htmlMessage = message.includes("<")
      ? message
      : `<b>${escapeHtml(message)}</b>`;
    const info = await transporter.sendMail({
      from: `"${SMTP_USER}" <${SMTP_USER}>`,
      to: email,
      subject: theme,
      text: message.replace(/<[^>]*>/g, "").trim() || theme,
      html: htmlMessage,
    });
    console.log("Mailer: письмо отправлено, messageId: %s", info.messageId);
    return info;
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : String(err);
    console.error("Mailer: ошибка отправки:", msg);
    throw new Error(`Mailer: не удалось отправить письмо — ${msg}`);
  }
}

export default sendMail;
