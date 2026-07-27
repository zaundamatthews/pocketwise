const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
async function sendResetPasswordEmail(email, resetLink) {
  const mailOptions = {
    from: `Pocketwise AI <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Password Reset Request",

    text: `
        You requested password reset for your Pocketwise AI account.

        Use the following link to reset your password.

        ${resetLink}

        This link expires in 10 minutes

        If you did not request this reset, please ignore this email and your password will remain unchanged.
        `,
    html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Pocketwise AI Password Reset Request </h2>

            <p> You requested a password reset link for your Pocketwise AI account. </p>
            <p> 
              Click the button below to reset your password. This link will expire in 10 minutes.
            </p>

             <p>

           <a
              href="${resetLink}"
              style="
              display: inline-block;
              padding:12px 20px;
              background: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 5px;     
              "
              >
              Reset Password
           </a>
         </p>
        </div>
        `,
  };
  return transporter.sendMail(mailOptions);
}
module.exports = {
  sendResetPasswordEmail,
};
