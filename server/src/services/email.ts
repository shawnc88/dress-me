import { Resend } from 'resend';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function passwordResetHtml(displayName: string, resetLink: string): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0b0b0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#16161c;border-radius:16px;padding:32px;color:#f4f4f5;">
        <tr><td>
          <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:linear-gradient(90deg,#7c3aed22,#f59e0b22);color:#c4b5fd;font-size:11px;font-weight:700;letter-spacing:0.1em;">BE WITH ME</div>
          <h1 style="margin:24px 0 8px;font-size:24px;font-weight:800;color:#ffffff;">Reset your password</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a1a1aa;">Hey ${escapeHtml(displayName)},</p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a1a1aa;">Someone requested a password reset for your Be With Me account. Click the button below to choose a new one. This link expires in 1 hour.</p>
          <table cellpadding="0" cellspacing="0"><tr><td style="border-radius:12px;background:linear-gradient(90deg,#7c3aed,#a855f7);">
            <a href="${resetLink}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">Reset password</a>
          </td></tr></table>
          <p style="margin:24px 0 8px;font-size:12px;color:#71717a;">Or copy this URL into your browser:</p>
          <p style="margin:0 0 24px;font-size:11px;color:#a1a1aa;word-break:break-all;">${resetLink}</p>
          <hr style="border:none;border-top:1px solid #27272a;margin:24px 0;">
          <p style="margin:0;font-size:12px;color:#71717a;line-height:1.6;">If you didn't request this, you can ignore this email — your password won't change.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#52525b;">Be With Me · bewithme.live</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  displayName: string,
): Promise<void> {
  if (!resend) {
    logger.warn(`[email] RESEND_API_KEY not set — logging reset link instead. to=${to} link=${resetLink}`);
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject: 'Reset your Be With Me password',
      html: passwordResetHtml(displayName, resetLink),
    });
    if (error) throw new Error(`${error.name}: ${error.message}`);
    logger.info(`[email] Password reset sent to ${to}`);
  } catch (err: any) {
    logger.error(`[email] Password reset send failed for ${to}: ${err.message}`);
    throw err;
  }
}
