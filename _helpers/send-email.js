const SibApiV3Sdk = require('sib-api-v3-sdk');

module.exports = sendEmail;

// Uses Brevo / Sendinblue HTTPS transactional email API.
// This avoids SMTP blocking on managed hosting and keeps verification email
// delivery on the HTTPS port.
async function sendEmail({ to, subject, html, from = process.env.EMAIL_FROM, fromName = process.env.EMAIL_FROM_NAME }) {
    if (!process.env.BREVO_API_KEY) {
        throw new Error('BREVO_API_KEY is not set');
    }

    const client = SibApiV3Sdk.ApiClient.instance;
    const apiKey = client.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const sender = {
        email: from,
        name: fromName || undefined,
    };

    const message = new SibApiV3Sdk.SendSmtpEmail({
        to: [{ email: to }],
        sender,
        subject,
        htmlContent: html,
    });

    try {
        const response = await apiInstance.sendTransacEmail(message);
        console.log(`Brevo email sent to ${to}`);
        return response;
    } catch (err) {
        console.error('Brevo send error:', err.response?.body || err.message || err);
        throw err;
    }
}
