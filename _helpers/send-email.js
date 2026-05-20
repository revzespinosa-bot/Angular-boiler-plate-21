const sgMail = require('@sendgrid/mail');

module.exports = sendEmail;

// Uses SendGrid's HTTPS API (port 443) instead of SMTP — Render free-tier
// reliably blocks outbound SMTP but allows HTTPS, so this is the only
// reliable path to email delivery from a free Render service.
async function sendEmail({ to, subject, html, from = process.env.EMAIL_FROM }) {
    if (!process.env.SENDGRID_API_KEY) {
        throw new Error('SENDGRID_API_KEY is not set');
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = { to, from, subject, html };

    try {
        const [response] = await sgMail.send(msg);
        console.log(`Email sent to ${to} (status ${response.statusCode})`);
        return response;
    } catch (err) {
        // SendGrid attaches structured error info on .response.body
        console.error('SendGrid send error:', err.response?.body || err.message);
        throw err;
    }
}
