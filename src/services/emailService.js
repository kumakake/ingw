const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL;
    this.fromName = process.env.SENDGRID_FROM_NAME || 'InstaBridge';
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  }

  async sendEmail(to, subject, htmlContent, textContent) {
    const msg = {
      to,
      from: {
        email: this.fromEmail,
        name: this.fromName
      },
      subject,
      text: textContent,
      html: htmlContent
    };

    try {
      await sgMail.send(msg);
      return { success: true };
    } catch (error) {
      console.error('SendGrid error:', error.response?.body || error.message);
      throw new Error('Failed to send email');
    }
  }

  async sendVerificationEmail(email, token) {
    const verificationUrl = `${this.baseUrl}/user/register?token=${token}`;
    
    const subject = '【InstaBridge】ユーザー登録のご案内';
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #888; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>InstaBridge</h1>
    </div>
    <div class="content">
      <h2>ユーザー登録のご案内</h2>
      <p>【InstaBridge】へのご登録ありがとうございます。</p>
      <p>以下のボタンをクリックして、ユーザー登録を完了してください。</p>
      
      <p style="text-align: center;">
        <a href="${verificationUrl}" class="button">ユーザー登録を完了する</a>
      </p>
      
      <div class="warning">
        <strong>⚠️ ご注意</strong><br>
        このリンクは24時間有効です。期限が切れた場合は、再度メールアドレスの登録からやり直してください。
      </div>
      
      <p>ボタンがクリックできない場合は、以下のURLをブラウザにコピー＆ペーストしてください：</p>
      <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">
        ${verificationUrl}
      </p>
      
      <div class="footer">
        <p>このメールに心当たりがない場合は、このメールを無視してください。</p>
        <p>© InstaBridge</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
【InstaBridge】 - ユーザー登録のご案内

InstaBridgeへのご登録ありがとうございます。

以下のURLをクリックして、ユーザー登録を完了してください：
${verificationUrl}

このリンクは24時間有効です。期限が切れた場合は、再度メールアドレスの登録からやり直してください。

このメールに心当たりがない場合は、このメールを無視してください。
    `;

    return this.sendEmail(email, subject, htmlContent, textContent);
  }

  async sendPasswordResetEmail(email, token, loginAccount) {
    const resetUrl = `${this.baseUrl}/user/reset-password?token=${token}`;
    
    const subject = '【InstaBridge】パスワードリセットのご案内';
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #888; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .info { background: #e7f3ff; border: 1px solid #2196f3; padding: 15px; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>InstaBridge</h1>
    </div>
    <div class="content">
      <h2>パスワードリセットのご案内</h2>
      
      <div class="info">
        <strong>ログインアカウント:</strong> ${loginAccount}
      </div>
      
      <p>パスワードリセットのリクエストを受け付けました。</p>
      <p>以下のボタンをクリックして、新しいパスワードを設定してください。</p>
      
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">パスワードをリセットする</a>
      </p>
      
      <div class="warning">
        <strong>⚠️ ご注意</strong><br>
        このリンクは1時間有効です。期限が切れた場合は、再度パスワードリセットをリクエストしてください。
      </div>
      
      <p>ボタンがクリックできない場合は、以下のURLをブラウザにコピー＆ペーストしてください：</p>
      <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">
        ${resetUrl}
      </p>
      
      <div class="footer">
        <p>このメールに心当たりがない場合は、このメールを無視してください。アカウントは安全です。</p>
        <p>© InstaBridge</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
【InstaBridge】 - パスワードリセットのご案内

ログインアカウント: ${loginAccount}

パスワードリセットのリクエストを受け付けました。

以下のURLをクリックして、新しいパスワードを設定してください：
${resetUrl}

このリンクは1時間有効です。期限が切れた場合は、再度パスワードリセットをリクエストしてください。

このメールに心当たりがない場合は、このメールを無視してください。アカウントは安全です。
    `;

    return this.sendEmail(email, subject, htmlContent, textContent);
  }

  async sendSubscriptionConfirmationEmail(email, loginAccount, plan) {
    const planName = plan === 'monthly' ? '月額プラン（1,000円/月）' : '年額プラン（10,000円/年）';
    
    const subject = '【InstaBridge】サブスクリプション登録完了のお知らせ';
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    .success { background: #d4edda; border: 1px solid #28a745; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .info { background: #e7f3ff; border: 1px solid #2196f3; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>InstaBridge</h1>
    </div>
    <div class="content">
      <h2>サブスクリプション登録完了</h2>
      
      <div class="success">
        <strong>✅ 登録が完了しました！</strong><br>
        Instagram投稿機能がご利用いただけるようになりました。
      </div>
      
      <div class="info">
        <strong>ご契約内容:</strong><br>
        ログインアカウント: ${loginAccount}<br>
        プラン: ${planName}<br>
        無料トライアル: 初月無料
      </div>
      
      <p>ご登録ありがとうございます。</p>
      <p>サービス管理画面からライセンスを発行し、WordPressプラグインでご利用ください。</p>
      
      <div class="footer">
        <p>© InstaBridge</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
【InstaBridge】 - サブスクリプション登録完了のお知らせ

登録が完了しました！
Instagram投稿機能がご利用いただけるようになりました。

ご契約内容:
ログインアカウント: ${loginAccount}
プラン: ${planName}
無料トライアル: 初月無料

ご登録ありがとうございます。
サービス管理画面からライセンスを発行し、WordPressプラグインでご利用ください。
    `;

    return this.sendEmail(email, subject, htmlContent, textContent);
  }
}

module.exports = new EmailService();
