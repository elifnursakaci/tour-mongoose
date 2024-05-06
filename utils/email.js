const nodemailer = require("nodemailer");

const sendMailer = async (options) => {
  // 1- Transporter - taşıyıcı oluştur
  var transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  // 2- emailin içeriğini tanımla
  const mailOptions = {
    from: "elifnursakaci@gmail.com",
    to: options.email,
    subject: options.subject,
    text: options.subject,
    html: options.html,
  };

  // 3- email gönderilebilir
  await transporter.sendMail(mailOptions);
};

module.exports = { sendMailer };
