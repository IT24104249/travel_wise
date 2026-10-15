using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace TravelWise.Api.Services;

public interface IEmailService
{
    Task SendPasswordResetEmailAsync(string toEmail, string displayName, string resetToken, CancellationToken ct = default);
}

public sealed class EmailService(IConfiguration config, ILogger<EmailService> logger) : IEmailService
{
    public async Task SendPasswordResetEmailAsync(string toEmail, string displayName, string resetToken, CancellationToken ct = default)
    {
        var smtpHost    = config["Email:SmtpHost"]   ?? "smtp.gmail.com";
        var smtpPort    = int.Parse(config["Email:SmtpPort"]   ?? "587");
        var smtpUser    = (config["Email:SmtpUser"]   ?? "").Trim();
        var smtpPass    = (config["Email:SmtpPassword"] ?? "").Trim().Replace(" ", "");
        var fromName    = config["Email:FromName"]   ?? "TravelWise";
        var frontendUrl = config["Email:FrontendUrl"] ?? "http://localhost:5173";

        var resetLink = $"{frontendUrl}?reset_token={resetToken}&email={Uri.EscapeDataString(toEmail)}";

        if (string.IsNullOrWhiteSpace(smtpUser) || string.IsNullOrWhiteSpace(smtpPass) || 
            smtpUser.Contains("YOUR_GMAIL") || smtpPass.Contains("YOUR_GMAIL"))
        {
            logger.LogWarning("⚠️ Gmail SMTP not configured (placeholders detected in appsettings.Local.json). Email not sent.");
            logger.LogInformation("🔑 [DEV MODE] Reset Link for {Email}: {ResetLink}", toEmail, resetLink);
            return;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, smtpUser));
        message.To.Add(new MailboxAddress(displayName, toEmail));
        message.Subject = "🔑 Reset Your TravelWise Password";

        var bodyBuilder = new BodyBuilder
        {
            HtmlBody = $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0a0f1a; margin: 0; padding: 0; }}
    .container {{ max-width: 520px; margin: 40px auto; background: #121929; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }}
    .header {{ background: linear-gradient(135deg, #00c4b4, #2563eb); padding: 32px; text-align: center; }}
    .header h1 {{ color: #fff; margin: 0; font-size: 24px; }}
    .header p {{ color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }}
    .body {{ padding: 32px; color: #c8d3e8; }}
    .body p {{ line-height: 1.6; margin: 0 0 16px; }}
    .btn {{ display: block; width: fit-content; margin: 24px auto; background: linear-gradient(135deg, #00c4b4, #2563eb); color: #fff !important; text-decoration: none; padding: 14px 36px; border-radius: 50px; font-weight: 700; font-size: 15px; text-align: center; }}
    .token-box {{ background: #0d1724; border: 1px solid #1e3a5f; border-radius: 8px; padding: 14px 18px; font-family: monospace; font-size: 13px; color: #64b5f6; word-break: break-all; margin: 16px 0; }}
    .footer {{ background: #0d1724; padding: 20px 32px; text-align: center; color: #4a5a7a; font-size: 12px; }}
    .icon {{ font-size: 48px; display: block; margin: 0 auto 8px; }}
  </style>
</head>
<body>
  <div class='container'>
    <div class='header'>
      <span class='icon'>🌴</span>
      <h1>TravelWise</h1>
      <p>Sri Lanka Travel Intelligence Platform</p>
    </div>
    <div class='body'>
      <p>Hi <strong style='color:#fff'>{displayName}</strong>,</p>
      <p>We received a request to reset your TravelWise password. Click the button below to choose a new password:</p>
      <a href='{resetLink}' class='btn'>🔑 Reset My Password</a>
      <p style='font-size:13px;color:#6b7a9e;'>If the button doesn't work, copy and paste this link into your browser:</p>
      <div class='token-box'>{resetLink}</div>
      <p style='font-size:13px;color:#6b7a9e;'>⏰ This link expires in <strong style='color:#f59e0b'>15 minutes</strong>. If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
    <div class='footer'>
      © 2026 TravelWise · SE3090 Software Engineering Frameworks<br>
      This is an automated message — please do not reply.
    </div>
  </div>
</body>
</html>"
        };

        message.Body = bodyBuilder.ToMessageBody();

        try
        {
            using var client = new SmtpClient();
            await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls, ct);
            await client.AuthenticateAsync(smtpUser, smtpPass, ct);
            await client.SendAsync(message, ct);
            await client.DisconnectAsync(true, ct);

            logger.LogInformation("✅ Password reset email successfully sent to {Email} via Gmail SMTP ({User})", toEmail, smtpUser);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "❌ Failed to send email via Gmail SMTP ({User}): {Error}", smtpUser, ex.Message);
            logger.LogInformation("🔑 [DEV LINK FALLBACK] You can still reset password using this link: {ResetLink}", resetLink);
            throw;
        }
    }
}
