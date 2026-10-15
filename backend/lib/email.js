import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const LOG_FILE = path.join(process.cwd(), 'email-debug.log');

export function logToFile(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logMessage);
}

// Company Logo Base64
const LOGO_BASE64 = "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";

// ── Shared branding helper ──────────────────────────────────────────────────
// Every email function can call this with an optional `org` object
// ({ name, logo, slug }) to get company name + logo HTML dynamically.
async function getOrgBranding(org = null) {
    const companyName = org?.name || 'Miraki Labs';

    // Branded styling — Title-cased and concatenated, e.g. "MirakiLabs".
    // Used everywhere the company name is rendered (header, body, footer).
    const companyNameStyled = companyName;

    // Use a dynamic team name that defaults to HR Department
    // We prefix with the org name to ensure it's branded, but keep it clean.
    const teamName = org?.name ? `${org.name} Team` : 'Miraki Labs HR Team';

    const supportEmail = 'support@mirakilabs.com';

    // Improved contactInfo to avoid repeating the company name redundantly
    const contactInfo = org?.name
        ? 'Employee Self-Service Portal'
        : 'Mumbai, India | www.mirakilabs.com';

    const FRONTEND_BASE = (process.env.FRONTEND_URL || 'https://ess.miraki.in').replace(/\/$/, '');

    // Logo is embedded via CID attachment (see sendEmail). The actual image
    // bytes are attached per-message with cid: 'companylogo'.
    const logoHtml = '<img src="cid:companylogo" alt="Company Logo" width="180" style="width:180px; max-width: 100%; height:auto; display:block; margin: 0 auto 10px auto; border:0; outline:none; padding: 10px;" />';

    // Organization-specific logo or default Miraki Labs logo
    const logoBase64 = org?.logo || LOGO_BASE64;

    // Centralized login — single login page for all orgs (admins + employees).
    const portalLink = `${FRONTEND_BASE}/login`;

    // Dynamic sender name — keeps the same SMTP email but shows org name
    const smtpUser = process.env.SMTP_USER || 'hr@mirakilabs.com';
    const fromField = `"${companyName}" <${smtpUser}>`;

    return { companyName, companyNameStyled, teamName, supportEmail, contactInfo, logoHtml, logoBase64, portalLink, fromField };
}

/**
 * Sends a generic email using Nodemailer (SMTP).
 */
export async function sendEmail({ to, subject, html, text, from, attachments, logoBase64 = LOGO_BASE64 }) {
    const recipientArray = Array.isArray(to) ? to : [to];
    const results = [];
    const errors = [];

    // Ensure we handle cases where logoBase64 might be a full data URL by stripping the prefix
    const cleanLogoBase64 = logoBase64?.includes('base64,')
        ? logoBase64.split('base64,')[1]
        : logoBase64;

    const logoAttachment = {
        filename: 'logo.png',
        content: cleanLogoBase64,
        encoding: 'base64',
        cid: 'companylogo',
        contentDisposition: 'inline',
    };
    const mergedAttachments = Array.isArray(attachments)
        ? [...attachments, logoAttachment]
        : [logoAttachment];

    logToFile(`Initiating individual broadcast to ${recipientArray.length} recipients...`);

    // Send to all recipients concurrently. The pooled transporter (see below)
    // caps real parallelism at maxConnections and queues the rest, so we get
    // throughput without flooding the SMTP server. Previously this was a
    // sequential await-loop, so a 10-person broadcast took 10x a single send.
    await Promise.all(recipientArray.map(async (recipient) => {
        const mailOptions = {
            from: from || process.env.SMTP_FROM || '"Miraki Labs Announcements" <hr@mirakilabs.com>',
            to: recipient,
            subject,
            html,
            text,
            attachments: mergedAttachments
        };

        try {
            logToFile(`Sending individual email to: ${recipient} | Subject: ${subject}`);
            const info = await transporter.sendMail(mailOptions);
            logToFile(`SUCCESS: Sent to ${recipient}. MessageID: ${info.messageId}`);
            results.push(info);
        } catch (error) {
            logToFile(`ERROR: Failed for ${recipient}. Error: ${error.message}`);
            console.error(`Error sending email to ${recipient}:`, error);
            errors.push({ recipient, error: error.message });
        }
    }));

    if (errors.length > 0 && results.length === 0) {
        throw new Error(`Failed to send any emails. Samples: ${errors[0].error}`);
    }

    return { results, errors };
}

/**
 * Notify the next approver in the chain that a request awaits their decision.
 * Used by the multi-level approval escalation (lib/approval.js) for leave,
 * expense and fund requests. `finalStage` tweaks the wording for the admin pool.
 */
export async function sendApprovalPendingEmail({ approverEmail, approverName, requesterName, kind, summary, org = null, finalStage = false }) {
    if (!approverEmail) return;

    const { companyNameStyled, teamName, logoHtml, logoBase64, portalLink, fromField } = await getOrgBranding(org);
    const kindLabel = ({ leave: 'Leave', expense: 'Expense', fund: 'Fund' })[kind] || 'Request';
    const heading = finalStage
        ? `${kindLabel} request awaiting final approval`
        : `${kindLabel} request awaiting your approval`;
    const greeting = approverName ? `Hello ${approverName},` : 'Hello,';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f4f7f9;font-family:Arial,Helvetica,sans-serif;">
        <table role="presentation" style="border-spacing:0;width:100%;background-color:#f4f7f9;padding-bottom:40px;">
            <tr><td>
                <table role="presentation" style="background-color:#ffffff;margin:20px auto;width:100%;max-width:520px;border-spacing:0;color:#333;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                    <tr><td style="background-color:#eff6ff;padding:32px 30px;text-align:center;color:#1e3a8a;border-bottom:1px solid #dbeafe;">
                        <div style="margin-bottom:16px;">${logoHtml}</div>
                        <h2 style="margin:0;font-size:20px;">${heading}</h2>
                    </td></tr>
                    <tr><td style="padding:32px 40px;line-height:1.7;color:#111;">
                        <p style="margin:0 0 16px;">${greeting}</p>
                        <p style="margin:0 0 16px;"><strong>${requesterName}</strong> submitted ${summary}.</p>
                        <p style="margin:0 0 24px;">${finalStage
                            ? 'It has reached the admin level and needs a final decision.'
                            : 'It is now awaiting your approval. Once you approve, it moves to the next manager in the reporting line; rejecting it ends the request.'}</p>
                        <p style="text-align:center;margin:0 0 8px;">
                            <a href="${portalLink}" style="display:inline-block;background-color:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;font-size:14px;">Review request</a>
                        </p>
                    </td></tr>
                    <tr><td style="text-align:left;padding:0 40px 36px;color:#555;font-size:12px;">
                        <p style="margin:24px 0 0;">Regards,<br/>${teamName}</p>
                        <p style="margin:8px 0 0;color:#999;">${companyNameStyled}</p>
                    </td></tr>
                </table>
            </td></tr>
        </table>
    </body>
    </html>`;

    return sendEmail({
        to: approverEmail,
        subject: `Action needed: ${heading}`,
        html: htmlContent,
        from: fromField,
        logoBase64,
    });
}

// Create a transporter using environment variables.
// Connection pooling keeps a small set of authenticated SMTP connections open
// and reuses them across messages. Without it, every single email reopened a
// fresh TCP + TLS + AUTH handshake to Gmail, which we measured at 4-47s each —
// the dominant cost when broadcasting. The pool lets queued messages reuse warm
// connections (and send up to maxConnections in parallel), cutting per-email
// time dramatically.
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for others
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    }
});

/**
 * Sends the announcement email to a list of employees.
 */
export async function sendAnnouncementEmail(title, message, employeeEmails, effectiveDate, org = null) {
    if (!employeeEmails || employeeEmails.length === 0) {
        console.log('No employee emails found. Skipping broadcasting.');
        return;
    }

    const { companyNameStyled, teamName, logoHtml, logoBase64, fromField } = await getOrgBranding(org);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { margin: 0; padding: 0; background-color: #f4f7f9; font-family: Arial, Helvetica, sans-serif; }
            table { border-spacing: 0; width: 100%; }
            td { padding: 0; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f9; padding-bottom: 40px; }
            .main { background-color: #ffffff; margin: 20px auto; width: 100%; max-width: 500px; border-spacing: 0; color: #333333; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .header { background-color: #f0fdf4; padding: 35px 30px; text-align: center; color: #166534; border-bottom: 1px solid #dcfce7; }
            .logo-container { margin-bottom: 20px; }
            .content { padding: 35px 40px; line-height: 1.7; color: #000; }
            .announcement-box { margin: 25px 0; border-bottom: 1px solid #f0f0f0; padding-bottom: 25px; }
            .footer { text-align: left; padding: 0 40px 40px; color: #000; }
            .logo { width: 150px; height: auto; margin: 0 auto 15px auto; display: block; outline: none; border: none; }
            @media only screen and (max-width: 600px) {
                .logo { width: 120px !important; margin-bottom: 10px !important; }
            }
        </style>
    </head>
    <body>
        <center class="wrapper">
            <table class="main" role="presentation">
                <tr>
                    <td class="header">
                        <div class="logo-container">
                            ${logoHtml}
                        </div>
                        <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2;">${companyNameStyled}-Official Announcement</h1>
                    </td>
                </tr>
                <tr>
                    <td class="content">
                        <p style="font-size: 16px; margin: 0 0 20px;">Dear Team,</p>
                        <p style="font-size: 15px; margin: 0 0 20px;">We would like to inform you about the following announcement from <strong>${companyNameStyled}</strong>:</p>

                        <div class="announcement-box">
                            <h2 style="margin: 0 0 15px; font-size: 18px; color: #003366;">${title}</h2>
                            <div style="white-space: pre-wrap; margin-bottom: 15px; font-size: 15px; color: #000;">${message}</div>
                            ${effectiveDate ? `<p style="margin: 15px 0 0; font-size: 14px;"><strong>Effective Date:</strong> ${effectiveDate}</p>` : ''}
                        </div>

                        <p style="font-size: 14px; margin: 20px 0 0;">
                            If you have any questions or require further clarification, please feel free to contact the <strong>${teamName}</strong>.
                        </p>
                    </td>
                </tr>
                <tr>
                    <td class="footer">
                        <p style="margin: 0; font-size: 14px; line-height: 1.5;">
                            Thank you for your attention and cooperation.
                        </p>
                        <p style="margin-top: 25px; font-size: 15px; line-height: 1.5;">
                            Best Regards,<br>
                            <strong>${teamName}</strong>
                        </p>
                    </td>
                </tr>
            </table>
        </center>
    </body>
    </html>
    `;

    return sendEmail({
        to: employeeEmails,
        subject: `${title}`,
        html: htmlContent,
        from: fromField,
        logoBase64
    });
}

/**
 * Sends an organization-wide broadcast (Super Admin → all employees of an org).
 * `recipients` is an already-deduped, validated array of email addresses.
 * Returns { results, errors } from sendEmail so the caller can record history.
 */
export async function sendOrganizationBroadcastEmail({ subject, message, recipients, org = null }) {
    if (!recipients || recipients.length === 0) {
        console.log('No recipients found. Skipping organization broadcast.');
        return { results: [], errors: [] };
    }

    const { companyNameStyled, teamName, logoHtml, logoBase64, fromField } = await getOrgBranding(org);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { margin: 0; padding: 0; background-color: #f4f7f9; font-family: Arial, Helvetica, sans-serif; }
            table { border-spacing: 0; width: 100%; }
            td { padding: 0; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f9; padding-bottom: 40px; }
            .main { background-color: #ffffff; margin: 20px auto; width: 100%; max-width: 500px; border-spacing: 0; color: #333333; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .header { background-color: #f0fdf4; padding: 35px 30px; text-align: center; color: #166534; border-bottom: 1px solid #dcfce7; }
            .logo-container { margin-bottom: 20px; }
            .content { padding: 35px 40px; line-height: 1.7; color: #000; }
            .message-box { margin: 25px 0; border-bottom: 1px solid #f0f0f0; padding-bottom: 25px; }
            .footer { text-align: left; padding: 0 40px 40px; color: #000; }
        </style>
    </head>
    <body>
        <center class="wrapper">
            <table class="main" role="presentation">
                <tr>
                    <td class="header">
                        <div class="logo-container">
                            ${logoHtml}
                        </div>
                        <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2;">${companyNameStyled}</h1>
                    </td>
                </tr>
                <tr>
                    <td class="content">
                        <p style="font-size: 16px; margin: 0 0 20px;">Dear Team,</p>
                        <div class="message-box">
                            <h2 style="margin: 0 0 15px; font-size: 18px; color: #003366;">${subject}</h2>
                            <div style="white-space: pre-wrap; font-size: 15px; color: #000;">${message}</div>
                        </div>
                        <p style="font-size: 14px; margin: 20px 0 0;">
                            If you have any questions, please reach out to the <strong>${teamName}</strong>.
                        </p>
                    </td>
                </tr>
                <tr>
                    <td class="footer">
                        <p style="margin-top: 25px; font-size: 15px; line-height: 1.5;">
                            Best Regards,<br>
                            <strong>${teamName}</strong>
                        </p>
                    </td>
                </tr>
            </table>
        </center>
    </body>
    </html>
    `;

    return sendEmail({
        to: recipients,
        subject,
        html: htmlContent,
        from: fromField,
        logoBase64
    });
}

/**
 * Sends a payslip notification email to an employee.
 */
export async function sendSalarySlipEmail(email, personalEmail, employeeName, employeeId, department, month, year, org = null) {
    const { companyNameStyled, teamName, logoHtml, logoBase64, fromField } = await getOrgBranding(org);
    const payPeriod = `${month} ${year}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { margin: 0; padding: 0; background-color: #f4f7f9; font-family: Arial, Helvetica, sans-serif; }
            table { border-spacing: 0; width: 100%; }
            td { padding: 0; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f9; padding-bottom: 40px; }
            .main { background-color: #ffffff; margin: 20px auto; width: 100%; max-width: 500px; border-spacing: 0; color: #333333; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .header { background-color: #f0fdf4; padding: 35px 30px; text-align: center; color: #166534; border-bottom: 1px solid #dcfce7; }
            .logo-container { margin-bottom: 20px; }
            .content { padding: 35px 40px; line-height: 1.7; color: #000; }
            .announcement-box { margin: 25px 0; border-bottom: 1px solid #f0f0f0; padding-bottom: 25px; }
            .footer { text-align: left; padding: 0 40px 40px; color: #000; }
            .logo { width: 150px; height: auto; margin: 0 auto 15px auto; display: block; outline: none; border: none; }
            @media only screen and (max-width: 600px) {
                .logo { width: 120px !important; margin-bottom: 10px !important; }
            }
        </style>
    </head>
    <body>
        <div class="main">
            <div class="header">
                <div class="logo-container">
                    ${logoHtml}
                </div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 700; line-height: 1.2;">${companyNameStyled}-Payroll Service</h1>
            </div>
            <div class="content">
                <p>Dear <strong>${employeeName}</strong>,</p>
                <p>Your salary payslip from <strong>${companyNameStyled}</strong> for <strong>${payPeriod}</strong> has been generated.</p>
                <div style="background: #fafbfc; border-left: 4px solid #16761fff; padding: 15px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>ID:</strong> ${employeeId || 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>Dept:</strong> ${department || 'N/A'}</p>
                </div>
                <p>Please log in to the portal to view the details.</p>
                <p style="margin-top: 30px;">Best Regards,<br><strong>${teamName}</strong></p>
            </div>
        </div>
    </body>
    </html>
    `;

    return sendEmail({
        to: Array.from(new Set([email, personalEmail].filter(Boolean))),
        subject: `Salary Payslip for ${payPeriod}`,
        html: htmlContent,
        from: fromField,
        logoBase64
    });
}

/**
 * Sends a holiday notification to all employees
 */
export async function sendHolidayEmail(employeeEmails, holidayName, date, org = null) {
    const { companyNameStyled, teamName, logoHtml, logoBase64, fromField } = await getOrgBranding(org);
    const formattedDate = new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { margin: 0; padding: 0; background-color: #f4f7f9; font-family: Arial, Helvetica, sans-serif; }
            table { border-spacing: 0; width: 100%; }
            td { padding: 0; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f9; padding-bottom: 40px; }
            .main { background-color: #ffffff; margin: 20px auto; width: 100%; max-width: 500px; border-spacing: 0; color: #333333; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .header { background-color: #f0fdf4; padding: 35px 30px; text-align: center; color: #166534; border-bottom: 1px solid #dcfce7; }
            .logo-container { margin-bottom: 20px; }
            .content { padding: 35px 40px; line-height: 1.7; color: #000; }
            .announcement-box { margin: 25px 0; border-bottom: 1px solid #f0f0f0; padding-bottom: 25px; }
            .footer { text-align: left; padding: 0 40px 40px; color: #000; }
            .logo { width: 150px; height: auto; margin: 0 auto 15px auto; display: block; outline: none; border: none; }
            @media only screen and (max-width: 600px) {
                .logo { width: 120px !important; margin-bottom: 10px !important; }
            }
        </style>
    </head>
    <body>
        <div class="main">
            <div class="header">
                <div class="logo-container">
                    ${logoHtml}
                </div>
                <h1 style="margin: 0; font-size: 24px; font-weight: 700; line-height: 1.2;">${companyNameStyled}-Holiday Announcement</h1>
            </div>
            <div class="content">
                <p style="font-size: 16px; margin-bottom: 20px;">Dear Team,</p>
                <p style="margin-bottom: 20px;">${companyNameStyled} is pleased to inform you that <strong>${formattedDate}</strong> will be observed as a <strong>company holiday</strong> on the occasion of <strong>${holidayName}</strong>.</p>
                <p style="margin-bottom: 20px;">All offices will remain closed on this day. Regular work operations will resume on the next working day.</p>
                <p style="margin-bottom: 20px;">Kindly plan your tasks accordingly.</p>
                <p style="margin-bottom: 20px;">We wish everyone a joyful and safe celebration.</p>
                <p style="margin-top: 30px; line-height: 1.5;">
                    Best Regards,<br>
                    <strong>${teamName}</strong>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    return sendEmail({ to: employeeEmails, subject: `Upcoming Holiday: ${holidayName}`, html, from: fromField, logoBase64 });
}

/**
 * Sends a leave application notification to the admin
 */
export async function sendLeaveApplicationEmail(employeeName, leaveDetails, managerEmail = null, managerName = null, org = null, orgAdminEmail = null) {
    const { companyNameStyled, teamName, logoHtml, logoBase64, fromField } = await getOrgBranding(org);
    const formattedStart = new Date(leaveDetails.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const formattedEnd = new Date(leaveDetails.endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    const attachments = [];
    if (leaveDetails.document && typeof leaveDetails.document === 'string' && leaveDetails.document.includes('base64,')) {
        try {
            const parts = leaveDetails.document.split(';base64,');
            const contentType = parts[0].split(':')[1];
            const extension = contentType.split('/')[1] || 'bin';
            const base64Content = parts[1];

            attachments.push({
                filename: `Leave_Document_${employeeName.replace(/\s+/g, '_')}.${extension}`,
                content: base64Content,
                encoding: 'base64',
                contentType: contentType
            });
        } catch (err) {
            console.error('Error parsing document attachment:', err);
        }
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { margin: 0; padding: 0; background-color: #f4f7f9; font-family: Arial, Helvetica, sans-serif; }
            table { border-spacing: 0; width: 100%; }
            td { padding: 0; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f9; padding-bottom: 40px; }
            .main { background-color: #ffffff; margin: 20px auto; width: 100%; max-width: 500px; border-spacing: 0; color: #333333; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .header { background-color: #f0fdf4; padding: 35px 30px; text-align: center; color: #166534; border-bottom: 1px solid #dcfce7; }
            .logo-container { margin-bottom: 20px; }
            .content { padding: 35px 40px; line-height: 1.7; color: #000; }
            .announcement-box { margin: 25px 0; border-bottom: 1px solid #f0f0f0; padding-bottom: 25px; }
            .footer { text-align: left; padding: 0 40px 40px; color: #000; }
            .logo { width: 150px; height: auto; margin: 0 auto 15px auto; display: block; outline: none; border: none; }
            @media only screen and (max-width: 600px) {
                .logo { width: 120px !important; margin-bottom: 10px !important; }
            }
        </style>
    </head>
    <body>
        <div class="main">
            <div class="header">
                <div class="logo-container">
                    ${logoHtml}
                </div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 700; line-height: 1.2;">${companyNameStyled}-New Leave Request</h1>
            </div>
            <div class="content">
                <p>Hello ${managerName || 'Admin'},</p>
                <p>A new leave application has been submitted at <strong>${companyNameStyled}</strong> by <strong>${employeeName}</strong>.</p>

                <div style="background: #fafbfc; border: 1px solid #eee; border-radius: 6px; padding: 25px; margin: 30px 0;">
                    <div class="label">Leave Type</div>
                    <div class="value">${leaveDetails.type}</div>

                    <div class="label">Duration</div>
                    <div class="value">${formattedStart} - ${formattedEnd}</div>

                    <div class="label">Description</div>
                    <div class="value" style="margin-bottom: 0;">${leaveDetails.reason || 'No description provided'}</div>
                </div>

                <p>Please log in to the Admin Dashboard to approve or reject this request.</p>
                <p style="margin-top: 30px; font-size: 14px; color: #999;">Best Regards,<br><strong>${teamName}</strong></p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Org admin(s) take priority. Only fall back to the global ADMIN_EMAIL env
    // (a shared inbox) when no org admin could be resolved, so real tenants get
    // the request at their own admin address. The reporting manager is always
    // included when known.
    const orgAdmins = (Array.isArray(orgAdminEmail) ? orgAdminEmail : [orgAdminEmail]).filter(Boolean);
    const fallback = orgAdmins.length === 0 ? [process.env.ADMIN_EMAIL || process.env.SMTP_USER] : [];
    const recipients = Array.from(
        new Set([...orgAdmins, ...fallback, managerEmail].filter(Boolean).map((e) => e.trim()))
    );

    return sendEmail({
        to: recipients,
        subject: `[Leave Request] ${employeeName} - ${leaveDetails.type}`,
        html: htmlContent,
        attachments,
        from: fromField,
        logoBase64
    });
}

/**
 * Sends a holiday cancellation notification to all employees
 */
export async function sendHolidayCancellationEmail(employeeEmails, holidayName, date, org = null) {
    const { companyNameStyled, teamName, logoHtml, logoBase64, fromField } = await getOrgBranding(org);
    const formattedDate = new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { margin: 0; padding: 0; background-color: #f4f7f9; font-family: Arial, Helvetica, sans-serif; }
            table { border-spacing: 0; width: 100%; }
            td { padding: 0; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f9; padding-bottom: 40px; }
            .main { background-color: #ffffff; margin: 20px auto; width: 100%; max-width: 500px; border-spacing: 0; color: #333333; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .header { background-color: #fef2f2; padding: 35px 30px; text-align: center; color: #991b1b; border-bottom: 1px solid #fee2e2; }
            .logo-container { margin-bottom: 20px; }
            .content { padding: 35px 40px; line-height: 1.7; color: #000; }
            .announcement-box { margin: 25px 0; border-bottom: 1px solid #f0f0f0; padding-bottom: 25px; }
            .footer { text-align: left; padding: 0 40px 40px; color: #000; }
            .logo { width: 150px; height: auto; margin: 0 auto 15px auto; display: block; outline: none; border: none; }
            @media only screen and (max-width: 600px) {
                .logo { width: 120px !important; margin-bottom: 10px !important; }
            }
        </style>
    </head>
    <body>
        <div class="main">
            <div class="header">
                <div class="logo-container">
                    ${logoHtml}
                </div>
                <h1 style="margin: 0; font-size: 24px; font-weight: 700; line-height: 1.2;">${companyNameStyled}-Holiday Update</h1>
                <p style="margin: 8px 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #b91c1c;">Holiday Cancelled</p>
            </div>
            <div class="content">
                <p style="font-size: 16px; margin-bottom: 20px;">Dear Team,</p>
                <p style="margin-bottom: 20px;">Please be informed that <strong>${companyNameStyled}</strong> has <strong>cancelled</strong> the scheduled holiday for <strong>${holidayName}</strong>.</p>
                
                <div style="background: #fef2f2; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #991b1b;"><strong>Original Date:</strong> ${formattedDate}</p>
                </div>

                <p style="margin-bottom: 20px;">This will now be observed as a <strong>regular working day</strong>. We apologize for any inconvenience this change may cause to your plans.</p>
                
                <p style="margin-top: 30px; line-height: 1.5;">
                    Best Regards,<br>
                    <strong>${teamName}</strong>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    return sendEmail({ to: employeeEmails, subject: `Holiday Cancelled: ${holidayName}`, html: htmlContent, from: fromField, logoBase64 });
}

/**
 * Sends an expense claim notification to the admin
 */
export async function sendExpenseNotificationEmail(employeeName, amount, date, org = null, managerEmail = null, orgAdminEmail = null, managerName = null) {
    const { companyNameStyled, teamName, logoHtml, logoBase64, fromField } = await getOrgBranding(org);
    const formattedDate = new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { margin: 0; padding: 0; background-color: #f4f7f9; font-family: Arial, Helvetica, sans-serif; }
            table { border-spacing: 0; width: 100%; }
            td { padding: 0; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f9; padding-bottom: 40px; }
            .main { background-color: #ffffff; margin: 20px auto; width: 100%; max-width: 500px; border-spacing: 0; color: #333333; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .header { background-color: #f0fdf4; padding: 35px 30px; text-align: center; color: #166534; border-bottom: 1px solid #dcfce7; }
            .logo-container { margin-bottom: 20px; }
            .content { padding: 35px 40px; line-height: 1.7; color: #000; }
            .announcement-box { margin: 25px 0; border-bottom: 1px solid #f0f0f0; padding-bottom: 25px; }
            .footer { text-align: left; padding: 0 40px 40px; color: #000; }
            .logo { width: 150px; height: auto; margin: 0 auto 15px auto; display: block; outline: none; border: none; }
            @media only screen and (max-width: 600px) {
                .logo { width: 120px !important; margin-bottom: 10px !important; }
            }
        </style>
    </head>
    <body>
        <div class="main">
            <div class="header">
                ${logoHtml}
                <h1 style="margin: 0; font-size: 20px;">${companyNameStyled}-Expense Claim</h1>
            </div>
            <div class="content">
                <p>Hello ${managerName || 'Admin'},</p>
                <p>A new expense claim has been submitted at <strong>${companyNameStyled}</strong> by <strong>${employeeName}</strong> for your review.</p>

                <div class="details-box">
                    <div class="label">Total Amount</div>
                    <div class="value" style="font-size: 20px; color: #16761fff; font-weight: bold;">₹${amount}</div>

                    <div class="label">Submission Date</div>
                    <div class="value">${formattedDate}</div>
                </div>

                <p>Please log in to the Admin Dashboard to review the individual items and supporting documents.</p>
                <p style="margin-top: 30px; font-size: 14px; color: #999;">Best Regards,<br><strong>${teamName}</strong></p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Build recipient list
    const adminRecipients = Array.isArray(orgAdminEmail) ? orgAdminEmail : [orgAdminEmail || process.env.ADMIN_EMAIL || process.env.SMTP_USER];
    const recipients = Array.from(new Set([...adminRecipients, managerEmail].filter(Boolean)));

    return sendEmail({
        to: recipients,
        subject: `[Expense Claim] ${employeeName} - ₹${amount}`,
        html: htmlContent,
        from: fromField,
        logoBase64
    });
}

/**
 * Sends an expense status notification to the employee
 */
export async function sendExpenseStatusEmail(employeeEmail, status, amount, date, org = null, personalEmail = null) {
    const { companyNameStyled, teamName, logoHtml, logoBase64, fromField } = await getOrgBranding(org);
    const formattedDate = new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const isApproved = status.toLowerCase() === 'approved';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { margin: 0; padding: 0; background-color: #f4f7f9; font-family: Arial, Helvetica, sans-serif; }
            table { border-spacing: 0; width: 100%; }
            td { padding: 0; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f9; padding-bottom: 40px; }
            .main { background-color: #ffffff; margin: 20px auto; width: 100%; max-width: 500px; border-spacing: 0; color: #333333; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .header { background-color: #f0fdf4; padding: 35px 30px; text-align: center; color: #166534; border-bottom: 1px solid #dcfce7; }
            .logo-container { margin-bottom: 20px; }
            .content { padding: 35px 40px; line-height: 1.7; color: #000; }
            .announcement-box { margin: 25px 0; border-bottom: 1px solid #f0f0f0; padding-bottom: 25px; }
            .footer { text-align: left; padding: 0 40px 40px; color: #000; }
            .logo { width: 150px; height: auto; margin: 0 auto 15px auto; display: block; outline: none; border: none; }
            @media only screen and (max-width: 600px) {
                .logo { width: 120px !important; margin-bottom: 10px !important; }
            }
        </style>
    </head>
    <body>
        <div class="main">
            <div class="header">
                ${logoHtml}
                <h1 style="margin: 0; font-size: 20px;">${companyNameStyled}-Expense Claim Update</h1>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>Your expense claim at <strong>${companyNameStyled}</strong>, submitted on <strong>${formattedDate}</strong> for the amount of <strong>₹${amount}</strong>, has been updated.</p>

                <div class="status-badge">${status}</div>

                <p>You can view the details and any notes by logging into your employee portal.</p>
                <p style="margin-top: 30px; font-size: 14px; color: #999;">Best Regards,<br><strong>${teamName}</strong></p>
            </div>
        </div>
    </body>
    </html>
    `;

    return sendEmail({
        to: Array.from(new Set([employeeEmail, personalEmail].filter(Boolean).map(e => e.trim()))),
        subject: `Expense Claim ${status}: ₹${amount}`,
        html: htmlContent,
        from: fromField,
        logoBase64
    });
}

/**
 * Sends a leave status notification to the employee
 */
export async function sendLeaveStatusEmail(employeeEmail, status, startDate, endDate, reason, org = null, personalEmail = null) {
    const { companyNameStyled, teamName, logoHtml, logoBase64, fromField } = await getOrgBranding(org);
    const formattedStart = new Date(startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const formattedEnd = new Date(endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const isApproved = status.toLowerCase() === 'approved';
    const statusColor = isApproved ? '#16761fff' : '#dc3545';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { margin: 0; padding: 0; background-color: #f4f7f9; font-family: Arial, Helvetica, sans-serif; }
            table { border-spacing: 0; width: 100%; }
            td { padding: 0; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f9; padding-bottom: 40px; }
            .main { background-color: #ffffff; margin: 20px auto; width: 100%; max-width: 500px; border-spacing: 0; color: #333333; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .header { background-color: #f0fdf4; padding: 35px 30px; text-align: center; color: #166534; border-bottom: 1px solid #dcfce7; }
            .logo-container { margin-bottom: 20px; }
            .content { padding: 35px 40px; line-height: 1.7; color: #000; }
            .status-banner { background-color: ${statusColor}; color: #ffffff; padding: 10px; text-align: center; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
            .details-box { background: #fafbfc; border: 1px solid #eee; border-radius: 6px; padding: 20px; margin: 20px 0; }
            .footer { text-align: left; padding: 0 40px 40px; color: #000; }
            .logo { width: 150px; height: auto; margin: 0 auto 15px auto; display: block; outline: none; border: none; }
            @media only screen and (max-width: 600px) {
                .logo { width: 120px !important; margin-bottom: 10px !important; }
            }
        </style>
    </head>
    <body>
        <center class="wrapper">
            <table class="main" role="presentation">
                <tr>
                    <td class="header">
                        ${logoHtml}
                        <h1 style="margin: 0; font-size: 22px;">${companyNameStyled}</h1>
                    </td>
                </tr>
                <tr>
                    <td class="status-banner">
                        Leave Request ${status}
                    </td>
                </tr>
                <tr>
                    <td class="content">
                        <p style="font-size: 16px; margin: 0 0 20px;">Dear Employee,</p>
                        <p style="font-size: 15px; margin: 0 0 20px;">We at <strong>${companyNameStyled}</strong> would like to inform you that your leave request has been <strong>${status.toLowerCase()}</strong>.</p>

                        <div class="details-box">
                            <p style="margin: 0 0 10px;"><strong>Leave Period:</strong> ${formattedStart} - ${formattedEnd}</p>
                            <p style="margin: 0;"><strong>Reason:</strong> ${reason || 'N/A'}</p>
                        </div>

                        <p style="font-size: 14px; margin: 20px 0 0;">
                            You can view the updated status and your remaining leave balance by logging into the <strong>Employee Self-Service Portal</strong>.
                        </p>
                    </td>
                </tr>
                <tr>
                    <td class="footer">
                        <p style="margin-top: 25px; font-size: 15px; line-height: 1.5;">
                            Best Regards,<br>
                            <strong>${teamName}</strong>
                        </p>
                    </td>
                </tr>
            </table>
        </center>
    </body>
    </html>
    `;

    return sendEmail({
        to: Array.from(new Set([employeeEmail, personalEmail].filter(Boolean).map(e => e.trim()))),
        subject: `Leave Request ${status}: ${formattedStart} - ${formattedEnd}`,
        html: htmlContent,
        from: fromField,
        logoBase64
    });
}

export async function sendWelcomeEmail({ name, email, personalEmail, password, org = null }) {
    const { companyNameStyled, teamName, supportEmail, contactInfo, portalLink, logoBase64, fromField } = await getOrgBranding(org);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { margin: 0; padding: 0; background-color: #f4f7f9; font-family: Arial, Helvetica, sans-serif; }
            table { border-spacing: 0; width: 100%; }
            td { padding: 0; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f9; padding-bottom: 40px; }
            .main { background-color: #ffffff; margin: 20px auto; width: 100%; max-width: 500px; border-spacing: 0; color: #333333; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .header { background-color: #f0fdf4; padding: 35px 30px; text-align: center; color: #166534; border-bottom: 1px solid #dcfce7; }
            .logo-container { margin-bottom: 20px; }
            .content { padding: 35px 40px; line-height: 1.7; color: #000; }
            .footer { text-align: left; padding: 0 40px 40px; color: #000; }
        </style>
    </head>
    <body>
        <center class="wrapper">
            <table class="main" role="presentation">
                <tr>
                    <td class="header">
                    
                        <h1 style="margin: 0; font-size: 22px; font-weight: 600;">Welcome to ${companyNameStyled}</h1>
                    </td>
                </tr>
                <tr>
                    <td class="content">
                        <p>Dear <strong>${name}</strong>,</p>
                        <p>Welcome to <strong>${companyNameStyled}</strong>.</p>
                        <p>Your employee account has been successfully created in our system. Please find your login details below:</p>

                        <h3 style="margin-top: 30px; font-size: 16px; color: #16761fff; border-bottom: 1px solid #e1eee2; padding-bottom: 10px; margin-bottom: 15px;">Employee Portal Login Details</h3>
                        <p style="margin: 10px 0;">• <strong>Login URL:</strong> <a href="${portalLink}">${portalLink}</a></p>
                        <p style="margin: 10px 0;">• <strong>Email / Username:</strong> ${email}</p>
                        <p style="margin: 10px 0;">• <strong>Temporary Password:</strong> <code style="padding: 3px 6px; border-radius: 4px; font-weight: bold; color: #333;">${password}</code></p>

                        <p style="font-weight: bold; font-size: 15px; margin-top: 30px; color: #333;">For security reasons, please follow the guidelines below:</p>
                        <ol>
                            <li>This password is <strong>temporary</strong> and should be changed immediately after your first login.</li>
                            <li><strong>Do not share your password</strong> with anyone, including colleagues or external parties.</li>
                            <li>Our company will <strong>never ask for your password via email or phone</strong>.</li>
                            <li>If you suspect unauthorized access, please contact the IT team immediately.</li>
                        </ol>

                        <p style="font-size: 14px; margin-top: 30px;">
                            By using the employee portal, you agree to comply with the company's <strong>IT policies, security guidelines, and terms of use</strong>.
                        </p>

                        <p style="font-size: 14px; margin-top: 20px;">
                            If you face any issues accessing your account, please contact the IT Support team at <strong><a href="mailto:${supportEmail}">${supportEmail}</a></strong>.
                        </p>

                        <p style="font-size: 15px; margin-top: 30px; font-weight: 500; color: #16761fff;">
                            We wish you a successful journey with <strong>${companyNameStyled}</strong>.
                        </p>
                    </td>
                </tr>
                <tr>
                    <td class="footer">
                        <p style="margin: 0; line-height: 1.6;">
                            Best Regards,<br>
                            <strong style="color: #444;">${teamName}</strong><br>
                            <span style="font-size: 12px;">${contactInfo}</span>
                        </p>
                        <p style="margin-top: 20px; font-size: 11px; color: #bbb;">
                            &copy; ${new Date().getFullYear()} ${companyNameStyled}. All rights reserved.
                        </p>
                    </td>
                </tr>
            </table>
        </center>
    </body>
    </html>
    `;

    return sendEmail({
        to: Array.from(new Set([email, personalEmail].filter(Boolean))),
        subject: `Welcome to ${companyNameStyled} - Account Created`,
        html: htmlContent,
        from: fromField,
        logoBase64
    });
}


export async function sendLeaveCancellationEmail(employeeName, leaveDetails, managerEmail = null, managerName = null, org = null) {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    const { companyNameStyled, teamName, logoHtml, logoBase64, fromField } = await getOrgBranding(org);
    const formattedStart = new Date(leaveDetails.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const formattedEnd = new Date(leaveDetails.endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { margin: 0; padding: 0; background-color: #f4f7f9; font-family: Arial, Helvetica, sans-serif; }
            table { border-spacing: 0; width: 100%; }
            td { padding: 0; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f9; padding-bottom: 40px; }
            .main { background-color: #ffffff; margin: 20px auto; width: 100%; max-width: 500px; border-spacing: 0; color: #333333; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .header { background-color: #f0fdf4; padding: 35px 30px; text-align: center; color: #166534; border-bottom: 1px solid #dcfce7; }
            .logo-container { margin-bottom: 20px; }
            .content { padding: 35px 40px; line-height: 1.7; color: #000; }
            .announcement-box { margin: 25px 0; border-bottom: 1px solid #f0f0f0; padding-bottom: 25px; }
            .footer { text-align: left; padding: 0 40px 40px; color: #000; }
            .logo { width: 150px; height: auto; margin: 0 auto 15px auto; display: block; outline: none; border: none; }
            @media only screen and (max-width: 600px) {
                .logo { width: 120px !important; margin-bottom: 10px !important; }
            }
        </style>
    </head>
    <body>
        <div class="main">
            <div class="header">
                ${logoHtml}
                <h1 style="margin: 0; font-size: 20px;">${companyNameStyled}-Leave Cancelled</h1>
            </div>
            <div class="content">
                <p>Hello ${managerName || 'Admin'},</p>
                <p>The leave application at <strong>${companyNameStyled}</strong> previously submitted by <strong>${employeeName}</strong> has been <strong>cancelled/withdrawn</strong> by the employee.</p>

                <div style="background: #fdedee; border: 1px solid #f5c2c7; border-radius: 6px; padding: 25px; margin: 30px 0;">
                    <div class="label">Leave Type</div>
                    <div class="value">${leaveDetails.type}</div>

                    <div class="label">Duration</div>
                    <div class="value">${formattedStart} - ${formattedEnd}</div>

                    <div class="label">Description</div>
                    <div class="value" style="margin-bottom: 0;">${leaveDetails.reason || 'No description provided'}</div>
                </div>

                <p>No further action is required from management regarding this specific request.</p>
                <p style="margin-top: 30px; font-size: 14px; color: #999;">Best Regards,<br><strong>${teamName}</strong></p>
            </div>
        </div>
    </body>
    </html>
    `;

    const recipients = Array.from(new Set([adminEmail, managerEmail].filter(Boolean)));

    return sendEmail({
        to: recipients,
        subject: `[Leave Cancelled] ${employeeName} - ${leaveDetails.type}`,
        html: htmlContent,
        from: fromField,
        logoBase64
    });
}

/**
 * Sends a password reset notification email to an employee.
 */
export async function sendPasswordResetEmail({ name, email, password, org = null }) {
    const { companyNameStyled, teamName, logoHtml, logoBase64, portalLink, fromField } = await getOrgBranding(org);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { margin: 0; padding: 0; background-color: #f4f7f9; font-family: Arial, Helvetica, sans-serif; }
            table { border-spacing: 0; width: 100%; }
            td { padding: 0; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f9; padding-bottom: 40px; }
            .main { background-color: #ffffff; margin: 20px auto; width: 100%; max-width: 500px; border-spacing: 0; color: #333333; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .header { background-color: #f0fdf4; padding: 35px 30px; text-align: center; color: #166534; border-bottom: 1px solid #dcfce7; }
            .logo-container { margin-bottom: 20px; }
            .content { padding: 35px 40px; line-height: 1.7; color: #000; }
            .footer { text-align: left; padding: 0 40px 40px; color: #000; }
            .logo { width: 150px; height: auto; margin: 0 auto 15px auto; display: block; outline: none; border: none; }
        </style>
    </head>
    <body>
        <div class="main">
            <div class="header">
                ${logoHtml}
                <h1 style="margin: 0; font-size: 22px; font-weight: 600;">${companyNameStyled}-Password Reset</h1>
            </div>
            <div class="content">
                <p>Dear <strong>${name}</strong>,</p>
                <p>Your password for the <strong>${companyNameStyled} Employee Portal</strong> has been reset by an administrator.</p>

                <h3 style="margin-top: 30px; font-size: 16px; color: #16761fff; border-bottom: 1px solid #e1eee2; padding-bottom: 10px; margin-bottom: 15px;">New Login Credentials</h3>
                <p style="margin: 10px 0;">• <strong>Login URL:</strong> <a href="${portalLink}">${portalLink}</a></p>
                <p style="margin: 10px 0;">• <strong>Email / Username:</strong> ${email}</p>
                <p style="margin: 10px 0;">• <strong>New Password:</strong> <code style="padding: 3px 6px; border-radius: 4px; font-weight: bold; color: #333; background-color: #f0f0f0; border: 1px solid #ccc;">${password}</code></p>

                <p style="font-weight: bold; font-size: 15px; margin-top: 30px; color: #333;">Important Security Note:</p>
                <p>Please log in and change this password immediately. Do not share your credentials with anyone.</p>

                <p style="font-size: 15px; margin-top: 30px; font-weight: 500; color: #16761fff;">
                    Best Regards,<br>
                    <strong>${teamName}</strong>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    return sendEmail({
        to: email,
        subject: `Your ${companyNameStyled} Password Has Been Reset`,
        html: htmlContent,
        from: fromField,
        logoBase64
    });
}

/**
 * Sends a custom plan request notification email to super admins.
 */
export async function sendCustomPlanRequestEmail({
    adminName,
    organizationName,
    users,
    duration,
    features,
    specialReq,
    superAdminEmails,
    org = null
}) {
    const portalLink = process.env.FRONTEND_URL || 'https://ess.miraki.in';
    const { companyNameStyled, teamName, logoHtml, logoBase64, fromField } = await getOrgBranding(org);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { margin: 0; padding: 0; background-color: #f4f7f9; font-family: Arial, Helvetica, sans-serif; }
            table { border-spacing: 0; width: 100%; }
            td { padding: 0; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f9; padding-bottom: 40px; }
            .main { background-color: #ffffff; margin: 20px auto; width: 100%; max-width: 600px; border-spacing: 0; color: #333333; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .header { background-color: #f0fdf4; padding: 35px 30px; text-align: center; color: #166534; border-bottom: 1px solid #dcfce7; }
            .logo-container { margin-bottom: 20px; }
            .content { padding: 35px 40px; line-height: 1.7; color: #000; }
            .footer { text-align: left; padding: 0 40px 40px; color: #000; }
            .logo { width: 150px; height: auto; margin: 0 auto 15px auto; display: block; outline: none; border: none; }
            .detail-box { background-color: #f8f9fa; border-left: 4px solid #16761fff; padding: 15px 20px; margin: 20px 0; border-radius: 4px; }
            .detail-row { margin: 10px 0; }
            .detail-label { font-weight: bold; color: #16761fff; display: inline-block; min-width: 140px; }
            .cta-button { display: inline-block; padding: 12px 30px; background-color: #16761fff; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="main">
            <div class="header">
                ${logoHtml}
                <h1 style="margin: 0; font-size: 22px; font-weight: 600;">${companyNameStyled}-New Custom Plan Request</h1>
            </div>
            <div class="content">
                <p>Dear Super Admin,</p>
                <p>A new custom plan request has been submitted via <strong>${companyNameStyled}</strong> by <strong>${adminName}</strong> from <strong>${organizationName}</strong>.</p>

                <h3 style="margin-top: 30px; font-size: 16px; color: #16761fff; border-bottom: 1px solid #e1eee2; padding-bottom: 10px; margin-bottom: 15px;">Request Details</h3>
                
                <div class="detail-box">
                    <div class="detail-row">
                        <span class="detail-label">Organization:</span>
                        <span>${organizationName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Requested By:</span>
                        <span>${adminName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Expected Users:</span>
                        <span>${users}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Duration:</span>
                        <span>${duration}</span>
                    </div>
                    ${features ? `
                    <div class="detail-row">
                        <span class="detail-label">Required Features:</span>
                        <span>${features}</span>
                    </div>
                    ` : ''}
                    ${specialReq ? `
                    <div class="detail-row">
                        <span class="detail-label">Special Requirements:</span>
                        <span>${specialReq}</span>
                    </div>
                    ` : ''}
                </div>

                <p>Please review this request and take appropriate action at your earliest convenience.</p>

                <a href="${portalLink}/super-admin/custom-requests" class="cta-button">View Custom Requests</a>

                <p style="font-size: 15px; margin-top: 30px; font-weight: 500; color: #16761fff;">
                    Best Regards,<br>
                    <strong>${teamName}</strong>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Send to all super admin emails
    const emailPromises = superAdminEmails.map(email =>
        sendEmail({
            to: email,
            subject: `New Custom Plan Request from ${organizationName}`,
            html: htmlContent,
            from: fromField,
            logoBase64
        })
    );

    return Promise.all(emailPromises);
}
/**
 * Sends a notification to the employee when they exceed their monthly expense limit
 */
export async function sendExpenseLimitExceededEmail(employeeEmail, employeeName, attemptedAmount, monthlyLimit, monthName, org = null, adminEmails = []) {
    const { companyNameStyled, teamName, logoHtml, logoBase64, fromField } = await getOrgBranding(org);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { margin: 0; padding: 0; background-color: #f4f7f9; font-family: Arial, Helvetica, sans-serif; }
            table { border-spacing: 0; width: 100%; }
            td { padding: 0; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f9; padding-bottom: 40px; }
            .main { background-color: #ffffff; margin: 20px auto; width: 100%; max-width: 500px; border-spacing: 0; color: #333333; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .header { background-color: #dc3545; padding: 25px 30px; text-align: center; color: #ffffff; }
            .content { padding: 35px 40px; line-height: 1.7; color: #000; }
            .details-box { background: #fff5f5; border: 1px solid #feb2b2; border-radius: 6px; padding: 20px; margin: 20px 0; }
            .label { font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; font-weight: bold; }
            .value { font-size: 16px; color: #2d3748; margin-bottom: 15px; font-weight: bold; }
            .footer { text-align: left; padding: 0 40px 40px; color: #000; }
            .logo { width: 150px; height: auto; margin: 0 auto 15px auto; display: block; outline: none; border: none; }
        </style>
    </head>
    <body>
        <div class="main">
            <div class="header">
                ${logoHtml}
                <h1 style="margin: 0; font-size: 20px;">${companyNameStyled}-Limit Alert</h1>
            </div>
            <div class="content">
                <p>Attention:</p>
                <p>An expense claim submission was attempted by <strong>${employeeName}</strong> at <strong>${companyNameStyled}</strong> that exceeds the assigned monthly limit for <strong>${monthName}</strong>.</p>

                <div class="details-box">
                    <div class="label">Attempted Claim</div>
                    <div class="value" style="color: #dc3545;">₹${attemptedAmount.toLocaleString()}</div>

                    <div class="label">Monthly Limit</div>
                    <div class="value">₹${monthlyLimit.toLocaleString()}</div>
                </div>

                <p>According to company policy, claims must stay within the assigned monthly limit. Management has been notified of this attempt.</p>
                <p style="margin-top: 30px; font-size: 14px; color: #999;">Best Regards,<br><strong>${teamName}</strong></p>
            </div>
        </div>
    </body>
    </html>
    `;

    const recipients = Array.from(new Set([employeeEmail, ...(Array.isArray(adminEmails) ? adminEmails : [adminEmails])].filter(Boolean)));

    return sendEmail({
        to: recipients,
        subject: `[Limit Alert] Expense Claim Exceeded for ${monthName} - ${employeeName}`,
        html: htmlContent,
        from: fromField,
        logoBase64
    });
}

/**
 * Sends an additional money request confirmation to the employee
 * and an action-required notification to admins.
 */
export async function sendAdditionalMoneyRequestEmail({ employeeName, employeeEmail, adminEmails, reason, amount, description, urgency, org }) {
    const { companyNameStyled, teamName, logoHtml, logoBase64, fromField } = await getOrgBranding(org);
    const formattedAmount = `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const urgencyColor = urgency === 'High' ? '#dc3545' : urgency === 'Medium' ? '#fd7e14' : '#198754';

    const sharedStyles = `
        body { margin: 0; padding: 0; background-color: #f4f7f9; font-family: Arial, Helvetica, sans-serif; }
        table { border-spacing: 0; width: 100%; }
        td { padding: 0; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f9; padding-bottom: 40px; }
        .main { background-color: #ffffff; margin: 20px auto; width: 100%; max-width: 520px; border-spacing: 0; color: #333333; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .header { background-color: #f0fdf4; padding: 35px 30px; text-align: center; color: #166534; border-bottom: 1px solid #dcfce7; }
        .content { padding: 35px 40px; line-height: 1.7; color: #000; }
        .detail-box { background: #fafbfc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px 25px; margin: 24px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #6b7280; font-weight: 600; }
        .detail-value { color: #111827; font-weight: 500; text-align: right; }
        .amount-highlight { font-size: 22px; font-weight: 800; color: #166534; }
        .urgency-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; color: #fff; font-size: 12px; font-weight: 700; background-color: ${urgencyColor}; }
        .footer { padding: 0 40px 35px; color: #555; font-size: 13px; }
    `;

    // ── Employee confirmation email ────────────────────────────────
    const employeeHtml = `
    <!DOCTYPE html><html><head><style>${sharedStyles}</style></head>
    <body><center class="wrapper"><table class="main" role="presentation">
        <tr><td class="header">
            <div>${logoHtml}</div>
            <h1 style="margin:0;font-size:22px;font-weight:700;">Request Submitted</h1>
            <p style="margin:6px 0 0;font-size:13px;color:#166534;">We've received your additional money request</p>
        </td></tr>
        <tr><td class="content">
            <p>Dear <strong>${employeeName}</strong>,</p>
            <p>Your additional money request has been successfully submitted to <strong>${companyNameStyled}</strong>. Our team will review it and get back to you shortly.</p>
            <div class="detail-box">
                <div class="detail-row"><span class="detail-label">Reason</span><span class="detail-value">${reason}</span></div>
                <div class="detail-row"><span class="detail-label">Amount Requested</span><span class="detail-value amount-highlight">${formattedAmount}</span></div>
                <div class="detail-row"><span class="detail-label">Urgency</span><span class="detail-value"><span class="urgency-badge">${urgency}</span></span></div>
                ${description ? `<div class="detail-row"><span class="detail-label">Additional Details</span><span class="detail-value" style="max-width:280px;">${description}</span></div>` : ''}
            </div>
            <p>You will be notified once the admin reviews your request. If you have any follow-up questions, please reach out to the HR team.</p>
        </td></tr>
        <tr><td class="footer">
            <p>Best Regards,<br><strong>${teamName}</strong></p>
        </td></tr>
    </table></center></body></html>`;

    // ── Admin notification email ────────────────────────────────────
    const adminHtml = `
    <!DOCTYPE html><html><head><style>${sharedStyles}</style></head>
    <body><center class="wrapper"><table class="main" role="presentation">
        <tr><td class="header">
            <div>${logoHtml}</div>
            <h1 style="margin:0;font-size:22px;font-weight:700;">${companyNameStyled} – Money Request</h1>
            <p style="margin:6px 0 0;font-size:13px;color:#166534;">Action Required – Additional Funds Requested</p>
        </td></tr>
        <tr><td class="content">
            <p>Hello Admin,</p>
            <p><strong>${employeeName}</strong> has submitted an additional money request that requires your review.</p>
            <div class="detail-box">
                <div class="detail-row"><span class="detail-label">Employee</span><span class="detail-value">${employeeName}</span></div>
                <div class="detail-row"><span class="detail-label">Reason</span><span class="detail-value">${reason}</span></div>
                <div class="detail-row"><span class="detail-label">Amount Requested</span><span class="detail-value amount-highlight">${formattedAmount}</span></div>
                <div class="detail-row"><span class="detail-label">Urgency</span><span class="detail-value"><span class="urgency-badge">${urgency}</span></span></div>
                ${description ? `<div class="detail-row"><span class="detail-label">Additional Details</span><span class="detail-value" style="max-width:280px;">${description}</span></div>` : ''}
            </div>
            <p>Please log in to the admin dashboard to approve or follow up on this request.</p>
        </td></tr>
        <tr><td class="footer">
            <p>Best Regards,<br><strong>${teamName}</strong></p>
        </td></tr>
    </table></center></body></html>`;

    // Send to employee first, then to admins
    await Promise.all([
        sendEmail({ to: employeeEmail, subject: `[Confirmed] Your Money Request – ${formattedAmount}`, html: employeeHtml, from: fromField, logoBase64 }),
        adminEmails.length > 0
            ? sendEmail({ to: adminEmails, subject: `[Action Required] Money Request from ${employeeName} – ${formattedAmount}`, html: adminHtml, from: fromField, logoBase64 })
            : Promise.resolve(),
    ]);
}

/**
 * Sends a notification to the employee when their money request status changes (Approved/Disabled).
 */
export async function sendMoneyRequestStatusEmail({ employeeEmail, personalEmail = null, employeeName, amount, status, reason, adminNote, org = null }) {
    const { companyNameStyled, teamName, logoHtml, logoBase64, fromField } = await getOrgBranding(org);
    const formattedAmount = `₹${parseFloat(amount).toLocaleString('en-IN')}`;
    const isApproved = status === 'Approved';
    const statusColor = isApproved ? '#166534' : '#991b1b';
    const statusBg = isApproved ? '#f0fdf4' : '#fef2f2';

    const sharedStyles = `
        body { margin: 0; padding: 0; background-color: #f4f7f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f9; padding-bottom: 40px; }
        .main { background-color: #ffffff; margin: 20px auto; width: 100%; max-width: 500px; border-spacing: 0; color: #333333; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); }
        .header { background-color: ${statusBg}; padding: 35px 30px; text-align: center; color: ${statusColor}; border-bottom: 1px solid ${isApproved ? '#dcfce7' : '#fee2e2'}; }
        .content { padding: 35px 40px; line-height: 1.6; color: #374151; }
        .detail-box { background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #6b7280; font-weight: 600; }
        .detail-value { color: #111827; font-weight: 500; text-align: right; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; color: #fff; font-size: 12px; font-weight: 700; background-color: ${statusColor}; text-transform: uppercase; }
        .footer { padding: 0 40px 35px; color: #6b7280; font-size: 13px; }
    `;

    const htmlContent = `
    <!DOCTYPE html><html><head><style>${sharedStyles}</style></head>
    <body><center class="wrapper"><table class="main" role="presentation">
        <tr><td class="header">
            <div>${logoHtml}</div>
            <h1 style="margin:0;font-size:22px;font-weight:700;">Request ${status}</h1>
            <p style="margin:6px 0 0;font-size:13px;color:${statusColor}; opacity: 0.8;">Status Update – Your Funds Request</p>
        </td></tr>
        <tr><td class="content">
            <p>Dear <strong>${employeeName}</strong>,</p>
            <p>This is to inform you that your additional money request at <strong>${companyNameStyled}</strong> has been <strong>${status.toLowerCase()}</strong> by the administration.</p>
            
            <div class="detail-box">
                <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="status-badge">${status}</span></span></div>
                <div class="detail-row"><span class="detail-label">Reason</span><span class="detail-value">${reason}</span></div>
                <div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value" style="color:${statusColor};font-weight:800;">${formattedAmount}</span></div>
                ${adminNote ? `<div class="detail-row"><span class="detail-label">Admin Note</span><span class="detail-value" style="max-width:260px; color: #111827;">${adminNote}</span></div>` : ''}
            </div>

            <p>${isApproved ? "The requested amount will be processed as per the company's financial policy." : "If you have any questions regarding this update, please contact the finance or HR department for more information."}</p>
        </td></tr>
        <tr><td class="footer">
            <p>Best Regards,<br><strong>${teamName}</strong></p>
        </td></tr>
    </table></center></body></html>`;

    return sendEmail({
        to: Array.from(new Set([employeeEmail, personalEmail].filter(Boolean).map(e => e.trim()))),
        subject: `[${status}] Your Money Request – ${formattedAmount}`,
        html: htmlContent,
        from: fromField,
        logoBase64
    });
}
