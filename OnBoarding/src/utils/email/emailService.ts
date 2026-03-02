import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL!,
    pass: process.env.EMAIL_PASSWORD!, // Gmail App Password
  },

  // IMPORTANT for Cloud Run
  connectionTimeout: 20_000,
  greetingTimeout: 20_000,
  socketTimeout: 20_000,
});

const sendEmailWithNodeMailer = async (
  from: string,
  to: string,
  subject: string,
  text: string,
  html: string
) => {
  const mailOptions = {
    from: `"KIBI Sports" <${process.env.EMAIL}>`,
    to,
    subject,
    text,
    html,
  };

  return transporter.sendMail(mailOptions);
};

export default sendEmailWithNodeMailer;
