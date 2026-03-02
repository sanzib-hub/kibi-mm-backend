import sendEmailWithNodeMailer from "./emailService.js";

export const sendOrganizationCredentialsEmail = async (
  to: string,
  organizationName: string,
  email: string,
  password: string
) => {
  const subject = "Your Organization Account is Ready | KIBI Sports";

  const html = `
    <h2>Welcome to KIBI Sports 🎉</h2>
    <p>Your organization <b>${organizationName}</b> has been onboarded successfully.</p>

    <h3>Login Credentials</h3>
    <p><b>Email:</b> ${email}</p>
    <p><b>Password:</b> ${password}</p>

    <p>
      <a href="https://admin.kibisports.com/">
        Click here to Login
      </a>
    </p>

    <p style="color:red">
      Please change your password after first login.
    </p>
  `;

  await sendEmailWithNodeMailer(
    "",
    to,
    subject,
    "Your organization login credentials",
    html
  );
};
