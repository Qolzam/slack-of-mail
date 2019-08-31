const crypto = require('crypto');
const qs = require('qs');
const fs = require('fs');
const nodemailer = require('nodemailer');
const md = require('markdown-it')({
    html: true,
    linkify: true,
    breaks: true,
    typographer: true
});
const emoji = require('markdown-it-emoji');
md.use(emoji)

/**
 * Hmac slack request sign verification 
 */
const signVerification = (data) => {

    const slackSign = process.env["Http_X_Slack_Signature"]
    const slackTime = process.env["Http_X_Slack_Request_Timestamp"]

    const signSecret = fs.readFileSync('/var/openfaas/secrets/sign-secret', 'utf8');

    let requestBody = qs.stringify(data, { format: 'RFC1738' });
    // throw new Error(slackSign + '   ' + slackTime+ '   ' + signSecret + '     ' + requestBody)
    let time = Math.floor(new Date().getTime() / 1000);
    if (Math.abs(time - slackTime) > 60 * 5) {
        return res.status(400).send('Ignore this request.');
        return {
            error: `The request timestamp is more than five minutes from local time. 
          It could be a replay attack, so let's ignore it.`
        }
    }
    if (!signSecret) {
        return {
            error: `Slack signing secret is empty.`
        }
    }
    let sigBasestring = 'v0:' + slackTime + ':' + requestBody;
    let mySignature = 'v0=' +
        crypto.createHmac('sha256', signSecret)
            .update(sigBasestring, 'utf8')
            .digest('hex');
    if (crypto.timingSafeEqual(
        Buffer.from(mySignature, 'utf8'),
        Buffer.from(slackSign, 'utf8'))
    ) {
        return {}
    } else {
        return {
            error: `Verification failed.`
        }
    }
}

/**
 * Send email
 * reference : https://codeburst.io/sending-an-email-using-nodemailer-gmail-7cfa0712a799
 */
const sendEmail = (emailTerget, subject, text, callback) => {
    const email = fs.readFileSync('/var/openfaas/secrets/email', 'utf8');
    const password = fs.readFileSync('/var/openfaas/secrets/password', 'utf8');

    const mailOptions = {
        from: email, // sender address
        to: emailTerget, // list of receivers
        subject: subject, // Subject line
        html: `<p>${text}</p>`// plain text body
    };

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: email,
            pass: password
        }
    });

    transporter.sendMail(mailOptions, function (err, info) {
        if (err) {
            callback({ error: err })
        }
        else {
            callback({ info })
        }
    });

}

/**
 * Process slach command text to extract => emails | subject | body 
 */
const processCommandText = (text) => {

    const [emails, subject, body] = text.split('|')
    return {
        emails,
        subject,
        body
    }
}

/**
 * Conver markdown to html
 */
const markdownToHtml = (body) => {
   return md.render(body);
}

module.exports = {
    signVerification,
    sendEmail,
    processCommandText,
    markdownToHtml
};