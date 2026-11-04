import nodemailer, { type Transporter } from "nodemailer";

let transport: Transporter | undefined;

function getTransport() {
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
    ignoreTLS: true, // local Mailpit only (ADR §2.2)
  });
  return transport;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await getTransport().sendMail({
    from: process.env.MAIL_FROM ?? "NutriTrack <no-reply@nutritrack.local>",
    to,
    subject: "Đặt lại mật khẩu NutriTrack",
    text: `Bạn vừa yêu cầu đặt lại mật khẩu NutriTrack.\n\nMở liên kết sau trong vòng 60 phút:\n${resetUrl}\n\nNếu không phải bạn, hãy bỏ qua email này.`,
  });
}
