import { Resend } from 'resend';
import { env } from '../config/env.js';
import Order from '../models/Order.js';

const getResendClient = () => {
  const apiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 'YOUR_RESEND_API_KEY') {
    return null;
  }
  return new Resend(apiKey);
};

const escapeHtml = (text) => {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const getClientUrl = () => {
  const raw = env.CLIENT_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  return String(raw).split(',')[0].trim().replace(/\/+$/, '');
};

const getFromEmail = () => {
  return (
    env.RESEND_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    'Hexa Store <onboarding@resend.dev>'
  );
};

const getAdminEmail = () => {
  return (
    env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    env.ADMIN_EMAIL ||
    'captainsit9@gmail.com'
  );
};

const emailWrapper = ({ title, subtitle, contentHtml, ctaText, ctaUrl }) => {
  const clientUrl = getClientUrl();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #0b0f19;
      padding: 40px 10px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #131b2e;
      border: 1px solid #23304d;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #1e1035 0%, #151b3b 100%);
      padding: 32px 30px;
      text-align: center;
      border-bottom: 1px solid #2d3b5e;
    }
    .logo-badge {
      display: inline-block;
      padding: 6px 16px;
      background: rgba(168, 85, 247, 0.15);
      border: 1px solid rgba(168, 85, 247, 0.4);
      border-radius: 9999px;
      color: #c084fc;
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .title {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .subtitle {
      margin: 8px 0 0 0;
      font-size: 14px;
      color: #94a3b8;
    }
    .body {
      padding: 30px;
    }
    .card {
      background-color: #18223c;
      border: 1px solid #283759;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .card-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #a855f7;
      margin-top: 0;
      margin-bottom: 12px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #23304d;
      font-size: 13px;
    }
    .info-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .info-label {
      color: #94a3b8;
    }
    .info-val {
      color: #f1f5f9;
      font-weight: 600;
      text-align: right;
    }
    .table-box {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 13px;
    }
    .table-box th {
      text-align: left;
      padding: 10px 8px;
      border-bottom: 1px solid #283759;
      color: #94a3b8;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .table-box td {
      padding: 12px 8px;
      border-bottom: 1px solid #1e2c4a;
      color: #f1f5f9;
    }
    .table-box tr:last-child td {
      border-bottom: none;
    }
    .alert-box {
      background-color: rgba(168, 85, 247, 0.1);
      border: 1px solid rgba(168, 85, 247, 0.3);
      border-radius: 10px;
      padding: 16px;
      margin: 20px 0;
      color: #e9d5ff;
      font-size: 13px;
      line-height: 1.5;
    }
    .btn-container {
      text-align: center;
      margin: 30px 0 10px 0;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      padding: 14px 32px;
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(147, 51, 234, 0.4);
    }
    .footer {
      padding: 24px 30px;
      background-color: #0d1322;
      border-top: 1px solid #1e293b;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      line-height: 1.6;
    }
    .footer a {
      color: #a855f7;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-badge">HEXA STORE</div>
        <h1 class="title">${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
      </div>
      <div class="body">
        ${contentHtml}
        ${
          ctaText && ctaUrl
            ? `
        <div class="btn-container">
          <a href="${escapeHtml(ctaUrl)}" class="btn" target="_blank">${escapeHtml(ctaText)}</a>
        </div>
        `
            : ''
        }
      </div>
      <div class="footer">
        <p style="margin:0 0 6px 0;">This email was sent automatically by <a href="${escapeHtml(clientUrl)}">HEXA Digital Store</a>.</p>
        <p style="margin:0;">For security, never share order links or verification details with third parties.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
};

const renderItemsSummaryHtml = (items = []) => {
  if (!items.length) return '<p style="color:#94a3b8;margin:0;">No items found.</p>';
  return `
    <table class="table-box">
      <thead>
        <tr>
          <th>Item / Plan</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
          <tr>
            <td>
              <strong>${escapeHtml(item.productName || item.name)}</strong>
              ${
                item.variantName
                  ? `<br><span style="color:#a855f7;font-size:11px;">Plan: ${escapeHtml(item.variantName)}</span>`
                  : ''
              }
              ${
                item.itemType === 'bundle'
                  ? `<br><span style="color:#38bdf8;font-size:11px;">Bundle (${(item.components || []).length} items)</span>`
                  : ''
              }
            </td>
            <td style="text-align:center;">${escapeHtml(item.quantity)}</td>
            <td style="text-align:right;font-weight:600;">৳${Number(
              (item.price || item.unitPrice || 0) * (item.quantity || 1)
            ).toLocaleString()}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;
};

/**
 * 1. Admin New Order Notification Email
 */
export const sendAdminNewOrderEmail = async (order) => {
  try {
    if (!order) return;
    if (order.adminNotificationEmailSent) {
      console.log(`[EmailService] Admin notification already sent for order ${order.orderNumber}. Skipping.`);
      return;
    }

    const resend = getResendClient();
    if (!resend) {
      console.warn('[EmailService] RESEND_API_KEY not configured. Skipping sendAdminNewOrderEmail.');
      return;
    }

    const clientUrl = getClientUrl();
    const adminEmail = getAdminEmail();
    const fromEmail = getFromEmail();
    const adminOrderUrl = `${clientUrl}/admin/orders`;

    const contentHtml = `
      <div class="card">
        <h3 class="card-title">Order Overview</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Order Number:</td>
            <td style="padding:6px 0;color:#ffffff;font-weight:700;text-align:right;">${escapeHtml(order.orderNumber)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Date & Time:</td>
            <td style="padding:6px 0;color:#cbd5e1;text-align:right;">${escapeHtml(
              new Date(order.createdAt || Date.now()).toLocaleString()
            )}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Order Status:</td>
            <td style="padding:6px 0;color:#38bdf8;font-weight:700;text-align:right;text-transform:uppercase;">${escapeHtml(
              order.status
            )}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Payment Status:</td>
            <td style="padding:6px 0;color:#facc15;font-weight:700;text-align:right;text-transform:uppercase;">${escapeHtml(
              order.payment?.status || 'pending'
            )}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Payment Method:</td>
            <td style="padding:6px 0;color:#ffffff;font-weight:600;text-align:right;">${escapeHtml(
              order.payment?.methodName || '—'
            )}</td>
          </tr>
          ${
            order.payment?.transactionId
              ? `
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Transaction ID:</td>
            <td style="padding:6px 0;color:#a855f7;font-family:monospace;font-weight:700;text-align:right;">${escapeHtml(
              order.payment.transactionId
            )}</td>
          </tr>
          `
              : ''
          }
          ${
            order.payment?.senderNumber
              ? `
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Sender Number:</td>
            <td style="padding:6px 0;color:#cbd5e1;font-family:monospace;text-align:right;">${escapeHtml(
              order.payment.senderNumber
            )}</td>
          </tr>
          `
              : ''
          }
          <tr>
            <td style="padding:10px 0 0 0;color:#94a3b8;font-size:15px;font-weight:700;border-top:1px solid #283759;">Total Amount:</td>
            <td style="padding:10px 0 0 0;color:#4ade80;font-size:18px;font-weight:800;text-align:right;border-top:1px solid #283759;">৳${Number(
              order.total || 0
            ).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div class="card">
        <h3 class="card-title">Customer Information</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:4px 0;color:#94a3b8;">Customer Name:</td>
            <td style="padding:4px 0;color:#ffffff;font-weight:600;text-align:right;">${escapeHtml(order.customer?.name)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#94a3b8;">Customer Email:</td>
            <td style="padding:4px 0;color:#cbd5e1;text-align:right;">${escapeHtml(order.customer?.email)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#94a3b8;">Customer Phone:</td>
            <td style="padding:4px 0;color:#cbd5e1;text-align:right;">${escapeHtml(order.customer?.phone || '—')}</td>
          </tr>
        </table>
      </div>

      <div class="card">
        <h3 class="card-title">Ordered Products (${(order.items || []).length})</h3>
        ${renderItemsSummaryHtml(order.items)}
      </div>
    `;

    const html = emailWrapper({
      title: 'New Order Received',
      subtitle: `Order ${order.orderNumber} requires payment verification and processing.`,
      contentHtml,
      ctaText: 'Open Admin Order Portal',
      ctaUrl: adminOrderUrl,
    });

    const response = await resend.emails.send({
      from: fromEmail,
      to: [adminEmail],
      subject: `[New Order] ${order.orderNumber} - ৳${Number(order.total || 0).toLocaleString()} from ${
        order.customer?.name || 'Customer'
      }`,
      html,
    });

    await Order.findByIdAndUpdate(order._id, {
      adminNotificationEmailSent: true,
      adminNotificationEmailSentAt: new Date(),
    }).catch(() => {});

    console.log(`[EmailService] Admin new order notification email sent for ${order.orderNumber}. ID:`, response?.data?.id);
  } catch (error) {
    console.error(`[EmailService] Failed to send admin new order email for ${order?.orderNumber}:`, error?.message || error);
  }
};

/**
 * 2. Customer Order Confirmation Email
 */
export const sendCustomerOrderConfirmationEmail = async (order) => {
  try {
    if (!order || !order.customer?.email) return;
    if (order.orderConfirmationEmailSent) {
      console.log(`[EmailService] Order confirmation email already sent for order ${order.orderNumber}. Skipping.`);
      return;
    }

    const resend = getResendClient();
    if (!resend) {
      console.warn('[EmailService] RESEND_API_KEY not configured. Skipping sendCustomerOrderConfirmationEmail.');
      return;
    }

    const clientUrl = getClientUrl();
    const fromEmail = getFromEmail();
    const customerOrderUrl = `${clientUrl}/account/orders/${order._id}`;

    const contentHtml = `
      <p style="font-size:15px;line-height:1.6;color:#e2e8f0;margin-top:0;">
        Hello <strong>${escapeHtml(order.customer?.name || 'Customer')}</strong>,
      </p>
      <p style="font-size:14px;line-height:1.6;color:#cbd5e1;">
        Thank you for choosing <strong>HEXA Store</strong>! We have successfully received your order <strong>#${escapeHtml(
          order.orderNumber
        )}</strong>.
      </p>

      <div class="card">
        <h3 class="card-title">Order Details</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Order Number:</td>
            <td style="padding:6px 0;color:#ffffff;font-weight:700;text-align:right;">${escapeHtml(order.orderNumber)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Order Status:</td>
            <td style="padding:6px 0;color:#38bdf8;font-weight:700;text-align:right;text-transform:uppercase;">${escapeHtml(
              order.status
            )}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Payment Method:</td>
            <td style="padding:6px 0;color:#ffffff;font-weight:600;text-align:right;">${escapeHtml(
              order.payment?.methodName || '—'
            )}</td>
          </tr>
          ${
            order.payment?.transactionId
              ? `
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Transaction ID:</td>
            <td style="padding:6px 0;color:#a855f7;font-family:monospace;font-weight:700;text-align:right;">${escapeHtml(
              order.payment.transactionId
            )}</td>
          </tr>
          `
              : ''
          }
          <tr>
            <td style="padding:10px 0 0 0;color:#94a3b8;font-size:14px;font-weight:700;border-top:1px solid #283759;">Total Payable:</td>
            <td style="padding:10px 0 0 0;color:#4ade80;font-size:17px;font-weight:800;text-align:right;border-top:1px solid #283759;">৳${Number(
              order.total || 0
            ).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div class="card">
        <h3 class="card-title">Purchased Items</h3>
        ${renderItemsSummaryHtml(order.items)}
      </div>

      <div class="alert-box">
        <strong>⚡ What's Next?</strong><br>
        Our team verifies payments and fulfills orders promptly. As soon as your digital delivery is complete, you will receive an instant notification and can view your credentials securely inside your account dashboard.
      </div>
    `;

    const html = emailWrapper({
      title: 'Order Received Successfully',
      subtitle: `Your order #${order.orderNumber} is now being processed.`,
      contentHtml,
      ctaText: 'View My Order & Status',
      ctaUrl: customerOrderUrl,
    });

    const response = await resend.emails.send({
      from: fromEmail,
      to: [order.customer.email],
      subject: `Order Received: ${order.orderNumber} - HEXA Store`,
      html,
    });

    await Order.findByIdAndUpdate(order._id, {
      orderConfirmationEmailSent: true,
      orderConfirmationEmailSentAt: new Date(),
    }).catch(() => {});

    console.log(`[EmailService] Customer order confirmation email sent for ${order.orderNumber}. ID:`, response?.data?.id);
  } catch (error) {
    console.error(`[EmailService] Failed to send customer confirmation email for ${order?.orderNumber}:`, error?.message || error);
  }
};

/**
 * 3. Customer Order Completed / Delivered Email
 */
export const sendCustomerOrderCompletedEmail = async (order) => {
  try {
    if (!order || !order.customer?.email) return;
    if (order.completionEmailSent) {
      console.log(`[EmailService] Completion email already sent for order ${order.orderNumber}. Skipping.`);
      return;
    }

    const resend = getResendClient();
    if (!resend) {
      console.warn('[EmailService] RESEND_API_KEY not configured. Skipping sendCustomerOrderCompletedEmail.');
      return;
    }

    const clientUrl = getClientUrl();
    const fromEmail = getFromEmail();
    const customerOrderUrl = `${clientUrl}/account/orders/${order._id}`;

    const contentHtml = `
      <p style="font-size:15px;line-height:1.6;color:#e2e8f0;margin-top:0;">
        Hello <strong>${escapeHtml(order.customer?.name || 'Customer')}</strong>,
      </p>
      
      <div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:12px;padding:20px;margin-bottom:20px;">
        <h2 style="margin:0 0 8px 0;color:#4ade80;font-size:18px;font-weight:800;">🎉 Digital Product Delivered!</h2>
        <p style="margin:0;font-size:14px;color:#dcfce7;line-height:1.6;">
          <strong>Your digital product has been delivered. Please log in to your account and open your order to securely view the delivery information.</strong>
        </p>
      </div>

      <div class="card">
        <h3 class="card-title">Order Information</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Order Number:</td>
            <td style="padding:6px 0;color:#ffffff;font-weight:700;text-align:right;">${escapeHtml(order.orderNumber)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Status:</td>
            <td style="padding:6px 0;color:#4ade80;font-weight:800;text-align:right;text-transform:uppercase;">DELIVERED / COMPLETED</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Total Paid:</td>
            <td style="padding:6px 0;color:#ffffff;font-weight:700;text-align:right;">৳${Number(order.total || 0).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div class="card">
        <h3 class="card-title">Delivered Items</h3>
        ${renderItemsSummaryHtml(order.items)}
      </div>

      <div class="alert-box">
        <strong>🔒 Security Notice:</strong><br>
        For your safety and privacy, passwords, profile PINs, and license activation keys are <strong>never sent directly inside email messages</strong>. Click the button below to log in and unlock your encrypted credentials securely.
      </div>
    `;

    const html = emailWrapper({
      title: 'Your Order Is Ready',
      subtitle: `Order #${order.orderNumber} has been fulfilled and delivered.`,
      contentHtml,
      ctaText: 'View Delivered Credentials',
      ctaUrl: customerOrderUrl,
    });

    const response = await resend.emails.send({
      from: fromEmail,
      to: [order.customer.email],
      subject: `Order Delivered: ${order.orderNumber} - Your Digital Credentials Are Ready`,
      html,
    });

    await Order.findByIdAndUpdate(order._id, {
      completionEmailSent: true,
      completionEmailSentAt: new Date(),
    }).catch(() => {});

    console.log(`[EmailService] Customer order completed email sent for ${order.orderNumber}. ID:`, response?.data?.id);
  } catch (error) {
    console.error(`[EmailService] Failed to send customer completed email for ${order?.orderNumber}:`, error?.message || error);
  }
};

/**
 * 4. Account Email Verification Email
 */
export const sendEmailVerificationEmail = async (user, rawToken) => {
  try {
    if (!user || !user.email || !rawToken) return;

    const resend = getResendClient();
    if (!resend) {
      console.warn('[EmailService] RESEND_API_KEY not configured. Skipping sendEmailVerificationEmail.');
      return;
    }

    const clientUrl = getClientUrl();
    const fromEmail = getFromEmail();
    const verificationUrl = `${clientUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;

    const contentHtml = `
      <p style="font-size:15px;line-height:1.6;color:#e2e8f0;margin-top:0;">
        Hello <strong>${escapeHtml(user.name || 'there')}</strong>,
      </p>
      
      <p style="font-size:14px;line-height:1.6;color:#cbd5e1;">
        Welcome to <strong>HEXA Store</strong>! To complete your registration and activate your account, please verify your email address.
      </p>

      <div class="alert-box">
        <strong>⏱️ Expiration Notice:</strong><br>
        This email verification link will expire in <strong>30 minutes</strong>. Once verified, you will be able to log in, place orders, and access your digital vault.
      </div>

      <div style="background-color:#18223c;border:1px solid #283759;border-radius:12px;padding:16px;margin:20px 0;font-size:13px;color:#94a3b8;">
        If the button above does not work, copy and paste the following link into your browser:<br>
        <a href="${escapeHtml(verificationUrl)}" style="color:#a855f7;word-break:break-all;text-decoration:underline;">${escapeHtml(verificationUrl)}</a>
      </div>

      <p style="font-size:12px;line-height:1.5;color:#64748b;margin-bottom:0;">
        If you did not sign up for a HEXA Store account, please disregard this email.
      </p>
    `;

    const html = emailWrapper({
      title: 'Verify Your Email',
      subtitle: 'Confirm your email address to activate your HEXA account.',
      contentHtml,
      ctaText: 'Verify Email Address',
      ctaUrl: verificationUrl,
    });

    const response = await resend.emails.send({
      from: fromEmail,
      to: [user.email],
      subject: 'Verify Your Email Address - HEXA Store',
      html,
    });

    console.log(`[EmailService] Email verification sent to ${user.email}. ID:`, response?.data?.id);
  } catch (error) {
    console.error(`[EmailService] Failed to send verification email to ${user?.email}:`, error?.message || error);
  }
};

/**
 * 4.5. Customer Notification: Password Reset Link
 */
export const sendPasswordResetEmail = async (user, rawToken) => {
  try {
    if (!user || !user.email || !rawToken) return;

    const resend = getResendClient();
    if (!resend) {
      console.warn('[EmailService] RESEND_API_KEY not configured. Skipping sendPasswordResetEmail.');
      return;
    }

    const clientUrl = getClientUrl();
    const fromEmail = getFromEmail();
    const resetUrl = `${clientUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    const contentHtml = `
      <p style="font-size:15px;line-height:1.6;color:#e2e8f0;margin-top:0;">
        Hello <strong>${escapeHtml(user.name || 'there')}</strong>,
      </p>
      
      <p style="font-size:14px;line-height:1.6;color:#cbd5e1;">
        We received a request to reset the password for your <strong>HEXA Store</strong> account. Click the button below to choose a new password:
      </p>

      <div class="alert-box">
        <strong>⏱️ Expiration Notice:</strong><br>
        This password reset link is valid for <strong>30 minutes</strong> and can only be used once.
      </div>

      <div style="background-color:#18223c;border:1px solid #283759;border-radius:12px;padding:16px;margin:20px 0;font-size:13px;color:#94a3b8;">
        If the button above does not work, copy and paste the following link into your browser:<br>
        <a href="${escapeHtml(resetUrl)}" style="color:#a855f7;word-break:break-all;text-decoration:underline;">${escapeHtml(resetUrl)}</a>
      </div>

      <p style="font-size:12px;line-height:1.5;color:#64748b;margin-bottom:0;">
        <strong>Security notice:</strong> If you did not request this password reset, please safely ignore this email. Your password will not change until you access the link above and create a new one.
      </p>
    `;

    const html = emailWrapper({
      title: 'Reset Your Password',
      subtitle: 'Set a new password for your HEXA Store account.',
      contentHtml,
      ctaText: 'Reset Password',
      ctaUrl: resetUrl,
    });

    const response = await resend.emails.send({
      from: fromEmail,
      to: [user.email],
      subject: 'Reset Your HEXA Store Password',
      html,
    });

    console.log(`[EmailService] Password reset email sent to ${user.email}. ID:`, response?.data?.id);
  } catch (error) {
    console.error(`[EmailService] Failed to send password reset email to ${user?.email}:`, error?.message || error);
  }
};

/**
 * 5. Admin Notification: New Wallet Credit Purchase Request
 */
export const sendAdminWalletCreditPurchaseEmail = async (purchase, user) => {
  try {
    if (!purchase || !user) return;
    if (purchase.adminNotificationEmailSent) {
      console.log(`[EmailService] Admin notification already sent for purchase ${purchase.purchaseNumber}. Skipping.`);
      return;
    }

    const resend = getResendClient();
    if (!resend) {
      console.warn('[EmailService] RESEND_API_KEY not configured. Skipping sendAdminWalletCreditPurchaseEmail.');
      return;
    }

    const clientUrl = getClientUrl();
    const adminEmail = getAdminEmail();
    const fromEmail = getFromEmail();
    const adminUrl = `${clientUrl}/admin/users?tab=credit_purchases`;

    const contentHtml = `
      <div class="card">
        <h3 class="card-title">Purchase Overview</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Request Number:</td>
            <td style="padding:6px 0;color:#ffffff;font-weight:700;text-align:right;">${escapeHtml(purchase.purchaseNumber)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Date & Time:</td>
            <td style="padding:6px 0;color:#cbd5e1;text-align:right;">${escapeHtml(
              new Date(purchase.createdAt || Date.now()).toLocaleString()
            )}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Status:</td>
            <td style="padding:6px 0;color:#facc15;font-weight:700;text-align:right;text-transform:uppercase;">PENDING VERIFICATION</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Package Name:</td>
            <td style="padding:6px 0;color:#c084fc;font-weight:700;text-align:right;">${escapeHtml(purchase.packageName || 'Credit Pack')}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Base Credits:</td>
            <td style="padding:6px 0;color:#ffffff;font-weight:600;text-align:right;">${Number(purchase.credits || 0).toLocaleString()} Credits</td>
          </tr>
          ${purchase.bonusCredits > 0 ? `
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Bonus Credits:</td>
            <td style="padding:6px 0;color:#4ade80;font-weight:700;text-align:right;">+${Number(purchase.bonusCredits).toLocaleString()} Bonus</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Total Credits to Add:</td>
            <td style="padding:6px 0;color:#a855f7;font-size:15px;font-weight:800;text-align:right;">${Number(purchase.totalCredits || 0).toLocaleString()} Credits</td>
          </tr>
          <tr>
            <td style="padding:10px 0 0 0;color:#94a3b8;font-size:15px;font-weight:700;border-top:1px solid #283759;">Amount Paid:</td>
            <td style="padding:10px 0 0 0;color:#4ade80;font-size:18px;font-weight:800;text-align:right;border-top:1px solid #283759;">৳${Number(
              purchase.amount || 0
            ).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div class="card">
        <h3 class="card-title">Payment & Customer Information</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:4px 0;color:#94a3b8;">Payment Method:</td>
            <td style="padding:4px 0;color:#ffffff;font-weight:600;text-align:right;">${escapeHtml(purchase.paymentMethod)}</td>
          </tr>
          ${purchase.senderNumber ? `
          <tr>
            <td style="padding:4px 0;color:#94a3b8;">Sender Number:</td>
            <td style="padding:4px 0;color:#cbd5e1;font-family:monospace;text-align:right;">${escapeHtml(purchase.senderNumber)}</td>
          </tr>
          ` : ''}
          ${purchase.transactionId ? `
          <tr>
            <td style="padding:4px 0;color:#94a3b8;">Transaction ID:</td>
            <td style="padding:4px 0;color:#a855f7;font-family:monospace;font-weight:700;text-align:right;">${escapeHtml(purchase.transactionId)}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding:4px 0;color:#94a3b8;">Customer Name:</td>
            <td style="padding:4px 0;color:#ffffff;font-weight:600;text-align:right;">${escapeHtml(user.name)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#94a3b8;">Customer Email:</td>
            <td style="padding:4px 0;color:#cbd5e1;text-align:right;">${escapeHtml(user.email)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#94a3b8;">Current Wallet Balance:</td>
            <td style="padding:4px 0;color:#38bdf8;font-weight:700;text-align:right;">৳${Number(user.walletBalance || 0).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div class="alert-box">
        <strong>⚡ Verification Required:</strong><br>
        Please check your receiving mobile wallet / bank statement to confirm receipt of ৳${Number(purchase.amount || 0).toLocaleString()} with Trx ID <strong>${escapeHtml(purchase.transactionId || 'N/A')}</strong> before approving.
      </div>
    `;

    const html = emailWrapper({
      title: 'New Wallet Credit Request',
      subtitle: `Purchase ${purchase.purchaseNumber} from ${user.name} requires payment verification.`,
      contentHtml,
      ctaText: 'Open Admin Wallet Portal',
      ctaUrl: adminUrl,
    });

    const response = await resend.emails.send({
      from: fromEmail,
      to: [adminEmail],
      subject: `[Wallet Purchase] ${purchase.purchaseNumber} - ৳${Number(purchase.amount || 0).toLocaleString()} for ${Number(purchase.totalCredits || 0).toLocaleString()} Credits from ${user.name}`,
      html,
    });

    console.log(`[EmailService] Admin wallet credit notification sent for ${purchase.purchaseNumber}. ID:`, response?.data?.id);
  } catch (error) {
    console.error(`[EmailService] Failed to send admin wallet purchase email for ${purchase?.purchaseNumber}:`, error?.message || error);
  }
};

/**
 * 6. Customer Notification: Wallet Credit Purchase Submitted (Pending)
 */
export const sendCustomerWalletCreditSubmittedEmail = async (purchase, user) => {
  try {
    if (!purchase || !user?.email) return;

    const resend = getResendClient();
    if (!resend) {
      console.warn('[EmailService] RESEND_API_KEY not configured. Skipping sendCustomerWalletCreditSubmittedEmail.');
      return;
    }

    const clientUrl = getClientUrl();
    const fromEmail = getFromEmail();
    const customerWalletUrl = `${clientUrl}/account/wallet/credits`;

    const contentHtml = `
      <p style="font-size:15px;line-height:1.6;color:#e2e8f0;margin-top:0;">
        Hello <strong>${escapeHtml(user.name || 'Customer')}</strong>,
      </p>
      <p style="font-size:14px;line-height:1.6;color:#cbd5e1;">
        We have received your wallet credit purchase request <strong>#${escapeHtml(purchase.purchaseNumber)}</strong>. Our team is now verifying your payment.
      </p>

      <div class="card">
        <h3 class="card-title">Request Summary</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Request Number:</td>
            <td style="padding:6px 0;color:#ffffff;font-weight:700;text-align:right;">${escapeHtml(purchase.purchaseNumber)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Status:</td>
            <td style="padding:6px 0;color:#facc15;font-weight:700;text-align:right;text-transform:uppercase;">PENDING VERIFICATION</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Package:</td>
            <td style="padding:6px 0;color:#c084fc;font-weight:600;text-align:right;">${escapeHtml(purchase.packageName || 'Credit Pack')}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Total Credits:</td>
            <td style="padding:6px 0;color:#a855f7;font-weight:800;text-align:right;">${Number(purchase.totalCredits || 0).toLocaleString()} Credits</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Payment Method:</td>
            <td style="padding:6px 0;color:#ffffff;font-weight:600;text-align:right;">${escapeHtml(purchase.paymentMethod)}</td>
          </tr>
          ${purchase.transactionId ? `
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Transaction ID:</td>
            <td style="padding:6px 0;color:#cbd5e1;font-family:monospace;text-align:right;">${escapeHtml(purchase.transactionId)}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding:10px 0 0 0;color:#94a3b8;font-size:14px;font-weight:700;border-top:1px solid #283759;">Amount Paid:</td>
            <td style="padding:10px 0 0 0;color:#4ade80;font-size:17px;font-weight:800;text-align:right;border-top:1px solid #283759;">৳${Number(
              purchase.amount || 0
            ).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div class="alert-box">
        <strong>⏳ What happens next?</strong><br>
        As soon as our billing team confirms receipt of your transaction, your wallet will be credited automatically and you will receive an instant confirmation email.
      </div>
    `;

    const html = emailWrapper({
      title: 'Credit Request Received',
      subtitle: `Your request #${purchase.purchaseNumber} is awaiting payment confirmation.`,
      contentHtml,
      ctaText: 'View Wallet & Status',
      ctaUrl: customerWalletUrl,
    });

    const response = await resend.emails.send({
      from: fromEmail,
      to: [user.email],
      subject: `Wallet Credit Purchase Pending: ${purchase.purchaseNumber} - HEXA Store`,
      html,
    });

    console.log(`[EmailService] Customer wallet request pending email sent for ${purchase.purchaseNumber}. ID:`, response?.data?.id);
  } catch (error) {
    console.error(`[EmailService] Failed to send customer pending wallet email for ${purchase?.purchaseNumber}:`, error?.message || error);
  }
};

/**
 * 7. Customer Notification: Wallet Credit Purchase Approved
 */
export const sendCustomerWalletCreditApprovedEmail = async (purchase, user, newBalance) => {
  try {
    if (!purchase || !user?.email) return;

    const resend = getResendClient();
    if (!resend) {
      console.warn('[EmailService] RESEND_API_KEY not configured. Skipping sendCustomerWalletCreditApprovedEmail.');
      return;
    }

    const clientUrl = getClientUrl();
    const fromEmail = getFromEmail();
    const customerWalletUrl = `${clientUrl}/account/wallet/credits`;

    const contentHtml = `
      <p style="font-size:15px;line-height:1.6;color:#e2e8f0;margin-top:0;">
        Hello <strong>${escapeHtml(user.name || 'Customer')}</strong>,
      </p>
      
      <div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:12px;padding:20px;margin-bottom:20px;">
        <h2 style="margin:0 0 8px 0;color:#4ade80;font-size:18px;font-weight:800;">🎉 Wallet Credited Successfully!</h2>
        <p style="margin:0;font-size:14px;color:#dcfce7;line-height:1.6;">
          Your payment of <strong>৳${Number(purchase.amount || 0).toLocaleString()}</strong> has been verified. <strong>${Number(purchase.totalCredits || 0).toLocaleString()} credits</strong> have been added to your account!
        </p>
      </div>

      <div class="card">
        <h3 class="card-title">Updated Account Balance</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Credits Added:</td>
            <td style="padding:6px 0;color:#4ade80;font-weight:800;text-align:right;">+${Number(purchase.totalCredits || 0).toLocaleString()} Credits</td>
          </tr>
          ${purchase.bonusCredits > 0 ? `
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Includes Bonus:</td>
            <td style="padding:6px 0;color:#a855f7;font-weight:700;text-align:right;">+${Number(purchase.bonusCredits).toLocaleString()} Bonus Credits</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding:10px 0 0 0;color:#94a3b8;font-size:15px;font-weight:700;border-top:1px solid #283759;">New Available Balance:</td>
            <td style="padding:10px 0 0 0;color:#38bdf8;font-size:19px;font-weight:900;text-align:right;border-top:1px solid #283759;">৳${Number(newBalance || 0).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div class="alert-box">
        <strong>⚡ Ready to Use:</strong><br>
        Your credits are immediately available. You can now use your wallet balance to purchase digital products, gaming top-ups, software keys, and subscriptions at checkout.
      </div>
    `;

    const html = emailWrapper({
      title: 'Wallet Credits Approved',
      subtitle: `Your request #${purchase.purchaseNumber} has been approved and credited.`,
      contentHtml,
      ctaText: 'Browse Store & Shop Now',
      ctaUrl: `${clientUrl}/products`,
    });

    const response = await resend.emails.send({
      from: fromEmail,
      to: [user.email],
      subject: `Wallet Credits Approved! ${purchase.purchaseNumber} - HEXA Store`,
      html,
    });

    console.log(`[EmailService] Customer wallet approved email sent for ${purchase.purchaseNumber}. ID:`, response?.data?.id);
  } catch (error) {
    console.error(`[EmailService] Failed to send customer approved wallet email for ${purchase?.purchaseNumber}:`, error?.message || error);
  }
};

/**
 * 8. Customer Notification: Wallet Credit Purchase Rejected
 */
export const sendCustomerWalletCreditRejectedEmail = async (purchase, user) => {
  try {
    if (!purchase || !user?.email) return;

    const resend = getResendClient();
    if (!resend) {
      console.warn('[EmailService] RESEND_API_KEY not configured. Skipping sendCustomerWalletCreditRejectedEmail.');
      return;
    }

    const clientUrl = getClientUrl();
    const fromEmail = getFromEmail();
    const supportUrl = `${clientUrl}/account/support`;

    const contentHtml = `
      <p style="font-size:15px;line-height:1.6;color:#e2e8f0;margin-top:0;">
        Hello <strong>${escapeHtml(user.name || 'Customer')}</strong>,
      </p>
      
      <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:20px;margin-bottom:20px;">
        <h2 style="margin:0 0 8px 0;color:#f87171;font-size:18px;font-weight:800;">⚠️ Payment Could Not Be Verified</h2>
        <p style="margin:0;font-size:14px;color:#fecaca;line-height:1.6;">
          Your wallet credit purchase request <strong>#${escapeHtml(purchase.purchaseNumber)}</strong> could not be verified and has been rejected.
        </p>
      </div>

      <div class="card">
        <h3 class="card-title">Request Details</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Request Number:</td>
            <td style="padding:6px 0;color:#ffffff;font-weight:700;text-align:right;">${escapeHtml(purchase.purchaseNumber)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Package:</td>
            <td style="padding:6px 0;color:#cbd5e1;text-align:right;">${escapeHtml(purchase.packageName || 'Credit Pack')}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Payment Method:</td>
            <td style="padding:6px 0;color:#cbd5e1;text-align:right;">${escapeHtml(purchase.paymentMethod)}</td>
          </tr>
          ${purchase.transactionId ? `
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Submitted Trx ID:</td>
            <td style="padding:6px 0;color:#cbd5e1;font-family:monospace;text-align:right;">${escapeHtml(purchase.transactionId)}</td>
          </tr>
          ` : ''}
          ${purchase.rejectionReason ? `
          <tr>
            <td style="padding:8px 0;color:#f87171;font-weight:700;">Reason for Rejection:</td>
            <td style="padding:8px 0;color:#fca5a5;font-weight:600;text-align:right;">${escapeHtml(purchase.rejectionReason)}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <div class="alert-box">
        <strong>Need Assistance?</strong><br>
        If you believe this was an error or already completed the payment transfer, please submit a support ticket with your transaction proof or screenshot.
      </div>
    `;

    const html = emailWrapper({
      title: 'Wallet Request Update',
      subtitle: `Update regarding your wallet credit purchase #${purchase.purchaseNumber}.`,
      contentHtml,
      ctaText: 'Contact Support',
      ctaUrl: supportUrl,
    });

    const response = await resend.emails.send({
      from: fromEmail,
      to: [user.email],
      subject: `Wallet Credit Request Update: ${purchase.purchaseNumber} - HEXA Store`,
      html,
    });

    console.log(`[EmailService] Customer wallet rejection email sent for ${purchase.purchaseNumber}. ID:`, response?.data?.id);
  } catch (error) {
    console.error(`[EmailService] Failed to send customer rejected wallet email for ${purchase?.purchaseNumber}:`, error?.message || error);
  }
};


