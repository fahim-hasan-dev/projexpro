import config from '../config'
import { ICreateAccount, IResetPassword } from '../interfaces/emailTemplate'

const LOGO_URL = 'https://i.ibb.co/Kj6XQH2W/logo.webp'

const createAccount = (values: ICreateAccount) => {
  return {
    to: values.email,
    subject: `Verify Your Account - ProjexPro`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your ProjexPro Account</title>
</head>
<body style="margin:0; padding:0; background-color:#F8F5FC; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F5FC; padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(91,27,149,0.08); border:1px solid #E9D5FF;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="background-color:#ffffff; padding:32px 20px; border-bottom:1px solid #E9D5FF;">
              <img src="${LOGO_URL}" alt="ProjexPro Logo" style="max-height:55px; width:auto; display:block;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 35px; color:#1E293B;">
              <h1 style="color:#5B1B95; font-size:24px; font-weight:700; margin:0 0 16px 0; text-align:center;">
                Welcome to ProjexPro! 👋
              </h1>

              <p style="color:#475569; font-size:15px; line-height:1.6; margin:0 0 24px 0; text-align:center;">
                Hi <strong>${values.name}</strong>,<br>
                Thank you for registering with <strong>ProjexPro</strong>. Please verify your email address using the verification code below:
              </p>

              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%); border: 2px dashed #5B1B95; border-radius: 12px; padding: 22px 0; text-align: center; margin: 28px auto; max-width: 320px;">
                <div style="font-size: 12px; font-weight: 700; color: #5B1B95; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">
                  Verification Code
                </div>
                <span style="font-size: 38px; font-weight: 800; color: #5B1B95; letter-spacing: 8px; font-family: monospace;">
                  ${values.otp}
                </span>
              </div>

              <p style="color:#64748B; font-size:14px; line-height:1.5; text-align:center; margin:0 0 24px 0;">
                This code is valid for <strong>5 minutes</strong>.<br>
                If you did not request account registration, please disregard this email.
              </p>

              <!-- Notice -->
              <div style="background-color:#FAF5FF; border-left:4px solid #5B1B95; border-radius:8px; padding:14px 16px;">
                <p style="margin:0; color:#5B1B95; font-size:13px; line-height:1.5;">
                  🔒 <strong>Security Notice:</strong> Never share this OTP with anyone. ProjexPro representatives will never ask for your verification code.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:#F8F5FC; padding:24px 20px; border-top:1px solid #E9D5FF; color:#64748B; font-size:13px;">
              <p style="margin:0; font-weight:600; color:#5B1B95;">ProjexPro Management System</p>
              <p style="margin:4px 0 0; color:#64748B;">© ${new Date().getFullYear()} ProjexPro. All rights reserved.</p>
              <p style="margin:6px 0 0; font-size:12px; color:#94A3B8;">This is an automated notification. Please do not reply directly.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  }
}

const resetPassword = (values: IResetPassword) => {
  return {
    to: values.email,
    subject: `Reset Your Password - ProjexPro`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your ProjexPro Password</title>
</head>
<body style="margin:0; padding:0; background-color:#F8F5FC; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F5FC; padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(91,27,149,0.08); border:1px solid #E9D5FF;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="background-color:#ffffff; padding:32px 20px; border-bottom:1px solid #E9D5FF;">
              <img src="${LOGO_URL}" alt="ProjexPro Logo" style="max-height:55px; width:auto; display:block;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 35px; color:#1E293B;">
              <h1 style="color:#5B1B95; font-size:24px; font-weight:700; margin:0 0 16px 0; text-align:center;">
                Password Reset Request 🔐
              </h1>

              <p style="color:#475569; font-size:15px; line-height:1.6; margin:0 0 24px 0; text-align:center;">
                Hi <strong>${values.name}</strong>,<br>
                We received a request to reset the password for your <strong>ProjexPro</strong> account. Use the code below to complete the reset process:
              </p>

              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%); border: 2px dashed #5B1B95; border-radius: 12px; padding: 22px 0; text-align: center; margin: 28px auto; max-width: 320px;">
                <div style="font-size: 12px; font-weight: 700; color: #5B1B95; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">
                  Reset Passcode
                </div>
                <span style="font-size: 38px; font-weight: 800; color: #5B1B95; letter-spacing: 8px; font-family: monospace;">
                  ${values.otp}
                </span>
              </div>

              <p style="color:#64748B; font-size:14px; line-height:1.5; text-align:center; margin:0 0 24px 0;">
                This code is valid for <strong>5 minutes</strong>.<br>
                If you did not request a password reset, you can safely ignore this email.
              </p>

              <!-- Security Tip -->
              <div style="background-color:#FAF5FF; border-left:4px solid #5B1B95; border-radius:8px; padding:14px 16px;">
                <p style="margin:0; color:#5B1B95; font-size:13px; line-height:1.5;">
                  ⚠️ <strong>Security Tip:</strong> Never share your passcode with anyone. ProjexPro will never ask for your reset code.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:#F8F5FC; padding:24px 20px; border-top:1px solid #E9D5FF; color:#64748B; font-size:13px;">
              <p style="margin:0; font-weight:600; color:#5B1B95;">ProjexPro Management System</p>
              <p style="margin:4px 0 0; color:#64748B;">© ${new Date().getFullYear()} ProjexPro. All rights reserved.</p>
              <p style="margin:6px 0 0; font-size:12px; color:#94A3B8;">This is an automated notification. Please do not reply directly.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  }
}

const resendOtp = (values: {
  email: string
  name: string
  otp: string
  type: 'resetPassword' | 'createAccount'
}) => {
  const isReset = values.type === 'resetPassword'

  return {
    to: values.email,
    subject: `${isReset ? 'Password Reset Code' : 'Verification Code'} - ProjexPro`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isReset ? 'Reset Your Password' : 'Verify Your Account'} - ProjexPro</title>
</head>
<body style="margin:0; padding:0; background-color:#F8F5FC; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F5FC; padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(91,27,149,0.08); border:1px solid #E9D5FF;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="background-color:#ffffff; padding:32px 20px; border-bottom:1px solid #E9D5FF;">
              <img src="${LOGO_URL}" alt="ProjexPro Logo" style="max-height:55px; width:auto; display:block;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 35px; color:#1E293B;">
              <h1 style="color:#5B1B95; font-size:24px; font-weight:700; margin:0 0 16px 0; text-align:center;">
                ${isReset ? 'Reset Your Password 🔐' : 'Verify Your Account 🚀'}
              </h1>

              <p style="color:#475569; font-size:15px; line-height:1.6; margin:0 0 24px 0; text-align:center;">
                Hi <strong>${values.name}</strong>,<br>
                ${isReset
                  ? 'Here is your new verification code to reset your ProjexPro password.'
                  : 'Here is your new verification code to complete your ProjexPro account setup.'
                }
              </p>

              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%); border: 2px dashed #5B1B95; border-radius: 12px; padding: 22px 0; text-align: center; margin: 28px auto; max-width: 320px;">
                <div style="font-size: 12px; font-weight: 700; color: #5B1B95; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">
                  New Verification Code
                </div>
                <span style="font-size: 38px; font-weight: 800; color: #5B1B95; letter-spacing: 8px; font-family: monospace;">
                  ${values.otp}
                </span>
              </div>

              <p style="color:#64748B; font-size:14px; line-height:1.5; text-align:center; margin:0 0 24px 0;">
                This code is valid for <strong>5 minutes</strong>.<br>
                If you did not request this, please ignore this email.
              </p>

              <!-- Security Notice -->
              <div style="background-color:#FAF5FF; border-left:4px solid #5B1B95; border-radius:8px; padding:14px 16px;">
                <p style="margin:0; color:#5B1B95; font-size:13px; line-height:1.5;">
                  🔒 <strong>Security Notice:</strong> Never share your verification code with anyone.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:#F8F5FC; padding:24px 20px; border-top:1px solid #E9D5FF; color:#64748B; font-size:13px;">
              <p style="margin:0; font-weight:600; color:#5B1B95;">ProjexPro Management System</p>
              <p style="margin:4px 0 0; color:#64748B;">© ${new Date().getFullYear()} ProjexPro. All rights reserved.</p>
              <p style="margin:6px 0 0; font-size:12px; color:#94A3B8;">This is an automated notification. Please do not reply directly.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  }
}

const adminContactNotificationEmail = (payload: {
  name: string
  email: string
  phone?: string
  message: string
}) => {
  return {
    to: config.super_admin.email as string,
    subject: `📩 New Contact Form Submission – ProjexPro`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Submission</title>
</head>
<body style="margin:0; padding:0; background-color:#F8F5FC; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F5FC; padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(91,27,149,0.08); border:1px solid #E9D5FF;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="background-color:#ffffff; padding:32px 20px; border-bottom:1px solid #E9D5FF;">
              <img src="${LOGO_URL}" alt="ProjexPro Logo" style="max-height:55px; width:auto; display:block;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 35px; color:#1E293B;">
              <h1 style="color:#5B1B95; font-size:24px; font-weight:700; margin:0 0 16px 0; text-align:center;">
                📬 New Contact Submission
              </h1>

              <p style="color:#475569; font-size:15px; line-height:1.6; margin:0 0 24px 0; text-align:center;">
                A new inquiry has been submitted through the <strong>ProjexPro</strong> contact form.
              </p>

              <!-- Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:24px; background:#FAF5FF; border-radius:12px; overflow:hidden; border:1px solid #E9D5FF;">
                <tr>
                  <td style="padding:14px 18px; font-size:14px; color:#64748B; font-weight:600; border-bottom:1px solid #E9D5FF;">👤 Name</td>
                  <td style="padding:14px 18px; font-size:14px; color:#1E293B; font-weight:600; text-align:right; border-bottom:1px solid #E9D5FF;">${payload.name}</td>
                </tr>
                <tr>
                  <td style="padding:14px 18px; font-size:14px; color:#64748B; font-weight:600; border-bottom:1px solid #E9D5FF;">📧 Email</td>
                  <td style="padding:14px 18px; font-size:14px; color:#5B1B95; font-weight:600; text-align:right; border-bottom:1px solid #E9D5FF;">${payload.email}</td>
                </tr>
                <tr>
                  <td style="padding:14px 18px; font-size:14px; color:#64748B; font-weight:600;">📞 Phone</td>
                  <td style="padding:14px 18px; font-size:14px; color:#1E293B; font-weight:600; text-align:right;">${payload.phone || 'N/A'}</td>
                </tr>
              </table>

              <!-- Message Box -->
              <div style="background: #F3E8FF; border: 1px solid #D8B4FE; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 700; color: #5B1B95; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">User Message</div>
                <p style="margin:0; font-size:14px; color:#1E293B; line-height:1.6; font-style:italic;">
                  “${payload.message}”
                </p>
              </div>

              <p style="color:#64748B; font-size:13px; text-align:center; margin:0;">
                You can respond directly by replying to <strong>${payload.email}</strong>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:#F8F5FC; padding:24px 20px; border-top:1px solid #E9D5FF; color:#64748B; font-size:13px;">
              <p style="margin:0; font-weight:600; color:#5B1B95;">ProjexPro Management System</p>
              <p style="margin:4px 0 0; color:#64748B;">© ${new Date().getFullYear()} ProjexPro. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  }
}

const userContactConfirmationEmail = (payload: {
  name: string
  email: string
  message: string
}) => {
  return {
    to: payload.email,
    subject: `💬 Thank You for Contacting ProjexPro`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You for Contacting ProjexPro</title>
</head>
<body style="margin:0; padding:0; background-color:#F8F5FC; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F5FC; padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(91,27,149,0.08); border:1px solid #E9D5FF;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="background-color:#ffffff; padding:32px 20px; border-bottom:1px solid #E9D5FF;">
              <img src="${LOGO_URL}" alt="ProjexPro Logo" style="max-height:55px; width:auto; display:block;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 35px; color:#1E293B;">
              <h1 style="color:#5B1B95; font-size:24px; font-weight:700; margin:0 0 16px 0; text-align:center;">
                Thank You for Contacting Us 💜
              </h1>

              <p style="color:#475569; font-size:15px; line-height:1.6; margin:0 0 24px 0; text-align:center;">
                Dear <strong>${payload.name}</strong>,<br>
                We have received your message! A member of the <strong>ProjexPro</strong> team will review your request and get back to you shortly.
              </p>

              <!-- Message Copy -->
              <div style="background: #F3E8FF; border: 1px solid #D8B4FE; border-radius: 12px; padding: 20px;">
                <div style="font-size: 12px; font-weight: 700; color: #5B1B95; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Summary of Your Message</div>
                <p style="margin:0; font-size:14px; color:#1E293B; line-height:1.6; font-style:italic;">
                  “${payload.message}”
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:#F8F5FC; padding:24px 20px; border-top:1px solid #E9D5FF; color:#64748B; font-size:13px;">
              <p style="margin:0; font-weight:600; color:#5B1B95;">ProjexPro Management System</p>
              <p style="margin:4px 0 0; color:#64748B;">© ${new Date().getFullYear()} ProjexPro. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  }
}

const subscriptionActivatedEmail = (data: any) => {
  const userName = data.user.firstName || data.user.name || 'Valued Customer'
  return {
    to: data.user.email,
    subject: `🎉 Subscription Activated – ProjexPro`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Activated - ProjexPro</title>
</head>
<body style="margin:0; padding:0; background-color:#F8F5FC; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F5FC; padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(91,27,149,0.08); border:1px solid #E9D5FF;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="background-color:#ffffff; padding:32px 20px; border-bottom:1px solid #E9D5FF;">
              <img src="${LOGO_URL}" alt="ProjexPro Logo" style="max-height:55px; width:auto; display:block;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 35px; color:#1E293B;">
              <h1 style="color:#5B1B95; font-size:24px; font-weight:700; margin:0 0 16px 0; text-align:center;">
                Subscription Activated! 🎉
              </h1>

              <p style="color:#475569; font-size:15px; line-height:1.6; margin:0 0 24px 0; text-align:center;">
                Hello <strong>${userName}</strong>,<br>
                Your subscription for <strong>${data.plan.title}</strong> has been successfully activated on <strong>ProjexPro</strong>.
              </p>

              <!-- Payment Details Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background:#FAF5FF; border-radius:12px; overflow:hidden; border:1px solid #E9D5FF;">
                <tr>
                  <td style="padding:14px 18px; font-size:14px; color:#64748B; font-weight:600; border-bottom:1px solid #E9D5FF;">Plan Title</td>
                  <td style="padding:14px 18px; font-size:14px; color:#1E293B; font-weight:600; text-align:right; border-bottom:1px solid #E9D5FF;">${data.plan.title}</td>
                </tr>
                <tr>
                  <td style="padding:14px 18px; font-size:14px; color:#64748B; font-weight:600; border-bottom:1px solid #E9D5FF;">Amount Paid</td>
                  <td style="padding:14px 18px; font-size:14px; color:#5B1B95; font-weight:700; text-align:right; border-bottom:1px solid #E9D5FF;">£${data.amountPaid}</td>
                </tr>
                <tr>
                  <td style="padding:14px 18px; font-size:14px; color:#64748B; font-weight:600;">Transaction ID</td>
                  <td style="padding:14px 18px; font-size:13px; color:#475569; font-family:monospace; text-align:right;">${data.trxId}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:#F8F5FC; padding:24px 20px; border-top:1px solid #E9D5FF; color:#64748B; font-size:13px;">
              <p style="margin:0; font-weight:600; color:#5B1B95;">ProjexPro Management System</p>
              <p style="margin:4px 0 0; color:#64748B;">© ${new Date().getFullYear()} ProjexPro. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  }
}

export const emailTemplate = {
  createAccount,
  resetPassword,
  resendOtp,
  userContactConfirmationEmail,
  adminContactNotificationEmail,
  subscriptionActivatedEmail,
}
