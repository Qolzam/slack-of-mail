"use strict"

const qs = require('qs');
const utils = require('./utils')

module.exports = (context, callback) => {

    // Parse query string
    const data = qs.parse(context)

    // Verify hmac
    const { error } = utils.signVerification(data)
    if (error) {
        callback(error, undefined)
        return
    }

    // Process command text
    const emailInfo = utils.processCommandText(data.text)

    // Convert body markdown to html
    const htmlBody = utils.markdownToHtml(emailInfo.body)

    // Email callback handler
    const emailCallback = (emailResult) => {
        let result = null
        if (emailResult.error) {
            result = {
                "text": "There is problem!",
                "attachments": [
                    {
                        "text": JSON.stringify(emailResult.error)
                    }
                ]
            }
        } else {
            result = {
                "text": "Email has been sent: " + emailInfo.emails + ' : ' + emailInfo.subject,
                "attachments": [
                    {
                        "text": htmlBody
                    }
                ]
            }
        }
        callback(undefined, result)
    }

    // Send email 
    utils.sendEmail(emailInfo.emails, emailInfo.subject, htmlBody, emailCallback)

}
