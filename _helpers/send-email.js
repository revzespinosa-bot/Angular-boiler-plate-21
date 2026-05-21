const SibApiV3Sdk = require('sib-api-v3-sdk');

module.exports = sendEmail;

async function sendEmail({ to, subject, html, from = process.env.EMAIL_FROM, fromName = process.env.EMAIL_FROM_NAME }) {
    if (!process.env.BREVO_API_KEY) {
        throw new Error('BREVO_API_KEY is not set');
    }
    if (!from) {
        throw new Error('EMAIL_FROM is not set or email from address not provided');
    }

    const client = SibApiV3Sdk.ApiClient.instance;
    const apiKey = client.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // Build the message by assigning properties on the instance
    // (the constructor-object form drops fields in this SDK version)
    const message = new SibApiV3Sdk.SendSmtpEmail();
    message.sender = { email: from };
    if (fromName) {
        message.sender.name = fromName;
    }
    message.to = [{ email: to }];
    message.subject = subject;
    message.htmlContent = html;

console.log('EMAIL_FROM value:', from);
console.log('Message sender:', JSON.stringify(message.sender));

    try {
        const response = await apiInstance.sendTransacEmail(message);
        console.log(`Brevo email sent to ${to}`);
        return response;
    } catch (err) {
        console.error('Brevo send error:', err.response?.body || err.message || err);
        throw err;
    }
}