import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "google",
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use `true` for port 465, `false` for all other ports
  auth: {
    user: "sli@sste.ru",
    pass: "c48-t4g-hfw-4jg",
  },
});

// async..await is not allowed in global scope, must use a wrapper
async function main(data) {
  // send mail with defined transport object
  const info = await transporter.sendMail({
    from: '"sli@sste.ru"', // sender address
    to: data.email, // list of receivers
    subject: data.theme, // Subject line
    text: "", // plain text body
    html: `<b>${data.message}</b>`, // html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <d786aa62-4e0a-070a-47ed-0b0666549519@ethereal.email>
}

export default main;
