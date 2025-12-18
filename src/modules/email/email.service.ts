import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly isDev: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') || 'noreply@bjjacademy.com';
    this.isDev = this.configService.get<string>('NODE_ENV') !== 'production';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend configured with API key');
    } else {
      this.resend = null;
      this.logger.warn('RESEND_API_KEY not set - emails will be logged to console');
    }
  }

  /**
   * Send OTP email for password recovery
   */
  async sendOtpEmail(to: string, otp: string): Promise<{ success: boolean; devOtp?: string }> {
    const subject = 'BJJ Academy - Código de Recuperação';
    
    const html = this.getBaseTemplate(`
      <h1 style="color: #1a202c; font-size: 24px; font-weight: 600; margin-bottom: 24px; text-align: center;">Recuperação de Senha</h1>
      <p style="margin-bottom: 24px; color: #4a5568;">Olá,</p>
      <p style="margin-bottom: 24px; color: #4a5568;">Recebemos uma solicitação para redefinir a senha da sua conta na <strong>BJJ Academy</strong>. Use o código de verificação abaixo:</p>
      
      <div style="background-color: #f7fafc; border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px; border: 1px solid #e2e8f0;">
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 48px; font-weight: 700; letter-spacing: 12px; color: #1a365d; display: block;">${otp}</span>
      </div>
      
      <p style="margin-bottom: 8px; color: #4a5568; font-size: 14px;"><strong>Este código é válido por 15 minutos.</strong></p>
      <p style="margin-bottom: 24px; color: #718096; font-size: 14px;">Se você não solicitou isso, pode ignorar este e-mail com segurança. Sua senha não será alterada até que você use o código acima.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 24px;" />
      <p style="color: #718096; font-size: 12px; text-align: center;">BJJ Academy - Tecnologia para a Arte Suave</p>
    `);

    return this.sendEmail(to, subject, html, otp);
  }

  /**
   * Send notification when an enrollment is approved
   */
  async sendMatriculaAprovadaEmail(to: string, nome: string, academiaNome: string): Promise<{ success: boolean }> {
    const subject = 'Matrícula Aprovada! Boas-vindas à BJJ Academy 🥋';
    
    const html = this.getBaseTemplate(`
      <h1 style="color: #1a202c; font-size: 24px; font-weight: 600; margin-bottom: 24px; text-align: left;">Sua matrícula foi aprovada!</h1>
      <p style="margin-bottom: 16px; color: #4a5568;">Olá, <strong>${nome}</strong>!</p>
      <p style="margin-bottom: 24px; color: #4a5568;">Temos ótimas notícias! Sua matrícula na <strong>${academiaNome}</strong> foi processada e aprovada pela nossa equipe.</p>
      
      <div style="background-color: #f0fff4; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px; border: 1px solid #c6f6d5;">
        <span style="font-size: 18px; font-weight: 700; color: #2f855a; display: block;">Matrícula Ativa</span>
        <p style="margin: 8px 0 0 0; color: #38a169; font-size: 14px;">Agora você já pode realizar check-ins e acompanhar seu progresso.</p>
      </div>

      <p style="margin-bottom: 24px; color: #4a5568; line-height: 1.6;">Estamos ansiosos para vê-lo no tatame. Prepare suas garras e seu kimono para a próxima aula!</p>
      
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="https://bjjacademy.app" style="background-color: #1a365d; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Acessar o App</a>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 24px;" />
      <p style="color: #718096; font-size: 14px; text-align: center;">Nos vemos no treino! <br/> <strong>Oss! 🥋</strong></p>
    `);

    return this.sendEmail(to, subject, html);
  }

  /**
   * Send notification when an enrollment is rejected
   */
  async sendMatriculaRejeitadaEmail(to: string, nome: string, academiaNome: string, motivo?: string): Promise<{ success: boolean }> {
    const subject = 'Atualização sobre sua solicitação de matrícula';
    
    const html = this.getBaseTemplate(`
      <h1 style="color: #1a202c; font-size: 24px; font-weight: 600; margin-bottom: 24px; text-align: left;">Solicitação de Matrícula</h1>
      <p style="margin-bottom: 16px; color: #4a5568;">Olá, <strong>${nome}</strong>,</p>
      <p style="margin-bottom: 24px; color: #4a5568;">Infelizmente, sua solicitação de matrícula na <strong>${academiaNome}</strong> não pôde ser aprovada no momento.</p>
      
      ${motivo ? `
      <div style="background-color: #fffaf0; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #feebc8;">
        <p style="margin: 0; color: #7b341e; font-size: 14px;"><strong>Observação da academia:</strong></p>
        <p style="margin: 8px 0 0 0; color: #9c4221; font-size: 15px;">${motivo}</p>
      </div>
      ` : ''}

      <p style="margin-bottom: 24px; color: #4a5568; line-height: 1.6;">Caso tenha alguma dúvida ou acredite que houve um equívoco, por favor entre em contato diretamente com a secretaria da academia.</p>
      
      <p style="color: #718096; font-size: 14px;">Atenciosamente,<br/> Equipe ${academiaNome}</p>
    `);

    return this.sendEmail(to, subject, html);
  }

  /**
   * Send invite email for manual registration
   */
  async sendInviteEmail(to: string, academiaNome: string, inviteUrl: string): Promise<{ success: boolean }> {
    const subject = `Convite: Junte-se à ${academiaNome} no BJJ Academy 🥋`;
    
    const html = this.getBaseTemplate(`
      <h1 style="color: #1a202c; font-size: 24px; font-weight: 600; margin-bottom: 24px; text-align: left;">Você foi convidado!</h1>
      <p style="margin-bottom: 16px; color: #4a5568;">Olá,</p>
      <p style="margin-bottom: 24px; color: #4a5568;">A equipe da <strong>${academiaNome}</strong> acaba de convidar você para fazer parte da plataforma <strong>BJJ Academy</strong>.</p>
      
      <div style="background-color: #f7fafc; border: 1px dashed #cbd5e0; border-radius: 12px; padding: 24px; margin-bottom: 32px; text-align: center;">
        <p style="margin: 0 0 16px 0; color: #4a5568; font-size: 15px;">Ao completar seu cadastro, você poderá acompanhar suas aulas, graduações e evoluções na arte suave.</p>
        <a href="${inviteUrl}" style="background-color: #1a365d; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Aceitar Convite e Cadastrar</a>
      </div>

      <p style="margin-bottom: 24px; color: #4a5568; line-height: 1.6;">O link acima expirará em breve. Clique no botão acima para definir sua senha e começar sua jornada.</p>
      
      <p style="color: #718096; font-size: 14px;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
      <p style="color: #3182ce; font-size: 12px; word-break: break-all;">${inviteUrl}</p>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 24px 0;" />
      <p style="color: #718096; font-size: 14px; text-align: center;">Vemos você no tatame! <br/> <strong>Oss! 🥋</strong></p>
    `);

    return this.sendEmail(to, subject, html);
  }

  /**
   * Send welcome email after registration
   */
  async sendWelcomeEmail(to: string, nome: string, academiaNome: string): Promise<{ success: boolean }> {
    const subject = `Bem-vindo à ${academiaNome}! 🥋`;
    
    const html = this.getBaseTemplate(`
      <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin-bottom: 16px; text-align: left;">Sua jornada começa agora!</h1>
      <p style="margin-bottom: 20px; color: #2d3748; font-size: 16px;">Olá, <strong>${nome}</strong>!</p>
      <p style="margin-bottom: 20px; color: #4a5568; line-height: 1.6;">É um prazer ter você na <strong>${academiaNome}</strong>. Estamos felizes em fazer parte da sua evolução no Jiu-Jitsu.</p>
      
      <div style="background: linear-gradient(135deg, #1a365d 0%, #2b6cb0 100%); border-radius: 12px; padding: 32px; color: white; margin-bottom: 32px; text-align: center;">
        <h2 style="margin: 0 0 16px 0; font-size: 20px;">Conta Criada com Sucesso</h2>
        <p style="margin: 0 0 24px 0; opacity: 0.9;">Você já pode acessar o app usando seu e-mail.</p>
        <a href="https://bjjacademy.app" style="background-color: #ffffff; color: #1a365d; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Acessar Painel</a>
      </div>

      <div style="margin-bottom: 32px;">
        <h3 style="color: #2d3748; font-size: 18px; margin-bottom: 12px;">O que você pode fazer agora?</h3>
        <ul style="color: #4a5568; padding-left: 20px; line-height: 1.8;">
          <li>Fazer check-ins nas suas aulas</li>
          <li>Acompanhar sua evolução de faixas e graus</li>
          <li>Ver o cronograma oficial da academia</li>
        </ul>
      </div>

      <p style="color: #718096; font-size: 14px; font-style: italic;">"O jiu-jitsu é uma ratueira. A ratueira não corre atrás do rato. Mas, quando o rato bota a garra no queijo, a armadilha dispara." — Helio Gracie</p>
      
      <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 24px; text-align: center;">
        <p style="color: #1a365d; font-weight: 700; margin-bottom: 4px;">Oss! 🥋</p>
        <p style="color: #a0aec0; font-size: 12px;">Equipe ${academiaNome}</p>
      </div>
    `);

    return this.sendEmail(to, subject, html);
  }

  /**
   * Wraps content in a premium responsive container
   */
  private getBaseTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>BJJ Academy</title>
        </head>
        <body style="background-color: #f4f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f9; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e1e8ed;">
                  <!-- Header/Logo -->
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center;">
                      <div style="display: inline-block; background-color: #1a365d; color: white; padding: 12px 20px; border-radius: 12px; font-weight: 800; font-size: 20px; letter-spacing: -0.5px;">
                        BJJ ACADEMY
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 20px 40px 40px 40px; font-size: 16px; line-height: 24px; color: #2d3748;">
                      ${content}
                    </td>
                  </tr>
                </table>
                
                <!-- Footer -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin-top: 24px;">
                  <tr>
                    <td style="text-align: center; color: #a0aec0; font-size: 12px; padding: 0 20px;">
                      <p style="margin-bottom: 8px;">© ${new Date().getFullYear()} BJJ Academy. Todos os direitos reservados.</p>
                      <p>Você recebeu este e-mail porque faz parte da comunidade BJJ Academy.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  /**
   * Generic send email method
   */
  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    devOtp?: string,
  ): Promise<{ success: boolean; devOtp?: string }> {
    // In dev mode without API key, just log
    if (!this.resend) {
      this.logger.log(`[DEV EMAIL] To: ${to}`);
      this.logger.log(`[DEV EMAIL] Subject: ${subject}`);
      if (devOtp) {
        this.logger.log(`[DEV EMAIL] OTP: ${devOtp}`);
        return { success: true, devOtp };
      }
      return { success: true };
    }

    try {
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });

      if (result.error) {
        this.logger.error(`Failed to send email: ${result.error.message}`);
        // In dev, still return success with OTP
        if (this.isDev && devOtp) {
          return { success: true, devOtp };
        }
        return { success: false };
      }

      this.logger.log(`Email sent to ${to}: ${result.data?.id}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Email send error: ${error}`);
      // In dev, still return success with OTP
      if (this.isDev && devOtp) {
        return { success: true, devOtp };
      }
      return { success: false };
    }
  }
}
