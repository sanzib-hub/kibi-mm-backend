import sendEmailWithNodeMailer from "./emailService.js";

export const sendSuperAdminOTPEmail = async (
  to: string,
  otp: string
) => {
  const subject = "Your KIBI Sports Super Admin Login OTP";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">KIBI Sports - Super Admin Login</h2>
      <p>Hello,</p>
      <p>You have requested to login to your Super Admin account. Please use the following OTP to complete your login:</p>
      
      <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
        <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        <strong>Important:</strong> This OTP is valid for 10 minutes only. Do not share this OTP with anyone.
      </p>
      
      <p style="color: #666; font-size: 14px;">
        If you did not request this OTP, please ignore this email or contact support immediately.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px; text-align: center;">
        This is an automated message from KIBI Sports. Please do not reply to this email.
      </p>
    </div>
  `;

  const text = `
    KIBI Sports - Super Admin Login
    
    Your OTP is: ${otp}
    
    This OTP is valid for 10 minutes only. Do not share this OTP with anyone.
    
    If you did not request this OTP, please ignore this email or contact support immediately.
  `;

  await sendEmailWithNodeMailer(
    "",
    to,
    subject,
    text,
    html
  );
};

