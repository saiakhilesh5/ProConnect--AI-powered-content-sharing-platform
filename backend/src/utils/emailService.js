import nodemailer from "nodemailer";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const APP_NAME = "ProConnect";
const BRAND_COLOR = "#7c3aed";
const BRAND_GRADIENT = "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)";

// ─── Transporter ─────────────────────────────────────────────────────────────
const createTransporter = () =>
  nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

// ─── Shared layout wrapper ────────────────────────────────────────────────────
const layout = (bodyContent) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#141414;border-radius:20px;overflow:hidden;border:1px solid #2a2a2a;">

          <!-- Header -->
          <tr>
            <td style="background:${BRAND_GRADIENT};padding:32px 40px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:16px;padding:12px 20px;">
                      <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">📸 ${APP_NAME}</span>
                    </div>
                    <p style="margin:10px 0 0;color:rgba(255,255,255,0.75);font-size:13px;letter-spacing:0.5px;">Share • Discover • Connect</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #2a2a2a;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#555;">You're receiving this because you're a member of ${APP_NAME}.</p>
              <p style="margin:0;font-size:12px;color:#444;">
                <a href="${FRONTEND_URL}" style="color:${BRAND_COLOR};text-decoration:none;">Visit ${APP_NAME}</a>
                &nbsp;·&nbsp;
                <a href="${FRONTEND_URL}/settings" style="color:${BRAND_COLOR};text-decoration:none;">Manage notifications</a>
              </p>
              <p style="margin:16px 0 0;font-size:11px;color:#333;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ─── Button helper ────────────────────────────────────────────────────────────
const ctaButton = (text, href) => `
  <div style="text-align:center;margin:28px 0 8px;">
    <a href="${href}" style="display:inline-block;background:${BRAND_GRADIENT};color:#ffffff;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">
      ${text}
    </a>
  </div>`;

// ─── Notification card helper ─────────────────────────────────────────────────
const notifCard = (emoji, headline, sub) => `
  <div style="background:#1e1e1e;border:1px solid #2e2e2e;border-radius:16px;padding:28px 32px;text-align:center;margin-bottom:24px;">
    <div style="font-size:48px;margin-bottom:12px;">${emoji}</div>
    <h2 style="margin:0 0 8px;color:#f5f5f5;font-size:22px;font-weight:700;">${headline}</h2>
    <p style="margin:0;color:#888;font-size:15px;line-height:1.6;">${sub}</p>
  </div>`;

// ─── Safe send wrapper (never throws, logs silently) ──────────────────────────
const safeSend = async (mailOptions) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error(`[EmailService] Failed to send "${mailOptions.subject}":`, err.message);
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// 1. WELCOME EMAIL
// ════════════════════════════════════════════════════════════════════════════════
export const sendWelcomeEmail = async ({ email, fullName, username }) => {
  const html = layout(`
    ${notifCard("🎉", `Welcome to ${APP_NAME}, ${fullName}!`, "We're so excited to have you here. Your creative journey starts now.")}

    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 8px;">
      Hi <strong style="color:#e0e0e0;">${fullName}</strong>,
    </p>
    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Your account <strong style="color:#a855f7;">@${username}</strong> is ready. Here's what you can do right now:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${[
        ["📸", "Upload stunning photos", "Share your best moments with the world"],
        ["🎬", "Post Reels", "Create short-form video content that goes viral"],
        ["❤️", "Like & Comment", "Engage with the creative community"],
        ["🔔", "Follow creators", "Get inspired by talented photographers & artists"],
      ].map(([icon, title, desc]) => `
        <tr>
          <td style="padding:10px 0;vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="48" style="vertical-align:top;padding-right:12px;">
                  <div style="width:40px;height:40px;background:#2a1a4a;border-radius:10px;text-align:center;line-height:40px;font-size:18px;">${icon}</div>
                </td>
                <td style="vertical-align:middle;">
                  <strong style="color:#e0e0e0;font-size:14px;">${title}</strong>
                  <br/><span style="color:#777;font-size:13px;">${desc}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`).join("")}
    </table>

    ${ctaButton("Explore Your Feed →", `${FRONTEND_URL}/feed`)}

    <p style="color:#555;font-size:13px;text-align:center;margin-top:20px;">
      Need help? Visit our <a href="${FRONTEND_URL}/help" style="color:${BRAND_COLOR};text-decoration:none;">Help Center</a>
    </p>
  `);

  await safeSend({
    from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `🎉 Welcome to ${APP_NAME}, ${fullName}!`,
    html,
  });
};

// ════════════════════════════════════════════════════════════════════════════════
// 2. LIKE EMAIL
// ════════════════════════════════════════════════════════════════════════════════
export const sendLikeEmail = async ({ recipientEmail, recipientName, senderName, senderUsername, imageTitle, imageId }) => {
  const imageLink = imageId ? `${FRONTEND_URL}/image/${imageId}` : `${FRONTEND_URL}/feed`;

  const html = layout(`
    ${notifCard("❤️", "Someone loved your photo!", `<strong style="color:#e0e0e0;">@${senderUsername}</strong> liked your image.`)}

    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Hi <strong style="color:#e0e0e0;">${recipientName}</strong>,
    </p>
    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 8px;">
      <strong style="color:#a855f7;">${senderName} (@${senderUsername})</strong> just liked your photo
      ${imageTitle ? `<strong style="color:#e0e0e0;"> "${imageTitle}"</strong>` : ""}.
      Your work is getting noticed — keep it up! 🌟
    </p>

    ${ctaButton("View Your Photo →", imageLink)}
  `);

  await safeSend({
    from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: `❤️ ${senderName} liked your photo on ${APP_NAME}`,
    html,
  });
};

// ════════════════════════════════════════════════════════════════════════════════
// 3. COMMENT EMAIL
// ════════════════════════════════════════════════════════════════════════════════
export const sendCommentEmail = async ({ recipientEmail, recipientName, senderName, senderUsername, commentText, imageTitle, imageId }) => {
  const imageLink = imageId ? `${FRONTEND_URL}/image/${imageId}` : `${FRONTEND_URL}/feed`;

  const html = layout(`
    ${notifCard("💬", "New comment on your photo!", `<strong style="color:#e0e0e0;">@${senderUsername}</strong> left a comment.`)}

    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Hi <strong style="color:#e0e0e0;">${recipientName}</strong>,
    </p>
    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 16px;">
      <strong style="color:#a855f7;">${senderName} (@${senderUsername})</strong> commented on your photo
      ${imageTitle ? `<strong style="color:#e0e0e0;"> "${imageTitle}"</strong>` : ""}:
    </p>

    <div style="background:#1a1a2e;border-left:4px solid ${BRAND_COLOR};border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:#d4b8ff;font-size:15px;line-height:1.6;font-style:italic;">"${commentText}"</p>
    </div>

    ${ctaButton("Reply to Comment →", imageLink)}
  `);

  await safeSend({
    from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: `💬 ${senderName} commented on your photo on ${APP_NAME}`,
    html,
  });
};

// ════════════════════════════════════════════════════════════════════════════════
// 4. REPLY EMAIL
// ════════════════════════════════════════════════════════════════════════════════
export const sendReplyEmail = async ({ recipientEmail, recipientName, senderName, senderUsername, replyText, imageId }) => {
  const imageLink = imageId ? `${FRONTEND_URL}/image/${imageId}` : `${FRONTEND_URL}/feed`;

  const html = layout(`
    ${notifCard("↩️", "Someone replied to your comment!", `<strong style="color:#e0e0e0;">@${senderUsername}</strong> replied to you.`)}

    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Hi <strong style="color:#e0e0e0;">${recipientName}</strong>,
    </p>
    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 16px;">
      <strong style="color:#a855f7;">${senderName} (@${senderUsername})</strong> replied to your comment:
    </p>

    <div style="background:#1a1a2e;border-left:4px solid #a855f7;border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:#d4b8ff;font-size:15px;line-height:1.6;font-style:italic;">"${replyText}"</p>
    </div>

    ${ctaButton("View the Conversation →", imageLink)}
  `);

  await safeSend({
    from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: `↩️ ${senderName} replied to your comment on ${APP_NAME}`,
    html,
  });
};

// ════════════════════════════════════════════════════════════════════════════════
// 5. MESSAGE EMAIL
// ════════════════════════════════════════════════════════════════════════════════
export const sendMessageEmail = async ({ recipientEmail, recipientName, senderName, senderUsername, messagePreview, messageType = "text" }) => {
  const typeLabels = {
    text: "sent you a message",
    image: "sent you a photo",
    voice: "sent you a voice message",
    reel: "shared a reel with you",
  };
  const typeEmojis = { text: "✉️", image: "🖼️", voice: "🎤", reel: "🎬" };
  const label = typeLabels[messageType] || "sent you a message";
  const emoji = typeEmojis[messageType] || "✉️";

  const previewLine = messageType === "text" && messagePreview
    ? `<div style="background:#1a1a2e;border-left:4px solid ${BRAND_COLOR};border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;color:#d4b8ff;font-size:15px;line-height:1.6;font-style:italic;">"${messagePreview.slice(0, 200)}${messagePreview.length > 200 ? "..." : ""}"</p>
       </div>`
    : "";

  const html = layout(`
    ${notifCard(emoji, `New message from ${senderName}!`, `<strong style="color:#e0e0e0;">@${senderUsername}</strong> ${label}.`)}

    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Hi <strong style="color:#e0e0e0;">${recipientName}</strong>,
    </p>
    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 16px;">
      <strong style="color:#a855f7;">${senderName} (@${senderUsername})</strong> ${label} on ${APP_NAME}.
    </p>

    ${previewLine}

    ${ctaButton("Open Messages →", `${FRONTEND_URL}/messages`)}

    <p style="color:#555;font-size:13px;text-align:center;margin-top:16px;">
      Reply quickly from the app to keep the conversation going 🚀
    </p>
  `);

  await safeSend({
    from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: `${emoji} ${senderName} ${label} — ${APP_NAME}`,
    html,
  });
};
