const nodemailer = require('nodemailer');
const smtpTransport = require("nodemailer-smtp-transport");

var transporter = nodemailer.createTransport(smtpTransport({
    service: 'gmail',
    auth: {
        type: "OAuth2",
        user: "yeshwanth.apis@gmail.com", 
        clientId: process.env.client_id,
        clientSecret: process.env.client_secret,
        refreshToken: process.env.refresh_token,
        accessToken: ""
      }
}));

var reset_mail_detail = {
  from: 'yeshwanth.apis@gmail.com',
  subject: 'Password Reset Link',
};

var activate_mail_detail = {
    from: 'yeshwanth.apis@gmail.com',
    subject: 'Link to Activate, Hack Pizza',
  };

function reset_email_template(token){
    let template = `
    <table style="width:100%; font-size:50px;">
        <tr align="center">
            <td>
                <img src="${process.env.frontend_host}logo.png" height="200px" width="200px">
                <div>Reset Password Link.</div>
                <a href="${process.env.reset_host}reset_link/${token}" target="_blank">Click Here</a>
                <div>To reset your password for our site</div>
            </td>
        </tr>
    </table>
    `
    return template;
}

function activate_email_template(token){
    let template = `
    <table style="width:100%; font-size:50px;">
        <tr align="center">
            <td>
                <img src="${process.env.frontend_host}logo.png" height="200px" width="200px">
                <div>Account Activation Link</div>
                <a href="${process.env.reset_host}activate_link/${token}" target="_blank">Click Here</a>
                <div>To activate account for Hack Pizza</div>
            </td>
        </tr>
    </table>
    `
    return template;
}

module.exports = {transporter, reset_mail_detail, reset_email_template, activate_mail_detail, activate_email_template}