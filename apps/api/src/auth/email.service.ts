import {Injectable, Logger, ServiceUnavailableException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';

export interface EmailMessage {
  to: string;
  toName: string;
  subject: string;
  text: string;
  actionUrl: string;
  actionLabel: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async send(message: EmailMessage): Promise<void> {
    const serviceId = this.config.get<string>('EMAILJS_SERVICE_ID');
    const templateId = this.config.get<string>('EMAILJS_TEMPLATE_ID');
    const publicKey = this.config.get<string>('EMAILJS_PUBLIC_KEY');
    const privateKey = this.config.get<string>('EMAILJS_PRIVATE_KEY');

    if (!serviceId || !templateId || !publicKey || !privateKey) {
      if (!this.developmentPreviewEnabled()) throw new ServiceUnavailableException('Email delivery is not configured');
      this.logger.log(`[development email] To: ${message.to} | ${message.subject} | ${message.actionUrl}`);
      return;
    }

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: privateKey,
        template_params: {
          to_email: message.to,
          to_name: message.toName,
          from_name: this.config.get('EMAIL_FROM_NAME', 'HouseFamily'),
          subject: message.subject,
          message: message.text,
          action_url: message.actionUrl,
          action_label: message.actionLabel,
        },
      }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);

    if (!response?.ok) {
      this.logger.error(`EmailJS delivery failed with status ${response?.status ?? 'network-error'}`);
      throw new ServiceUnavailableException('We could not send the email. Please try again shortly.');
    }
  }

  developmentPreviewEnabled(): boolean {
    return this.config.get('DEV_AUTH_ENABLED', 'false') === 'true' && !this.isConfigured();
  }

  private isConfigured(): boolean {
    return Boolean(this.config.get('EMAILJS_SERVICE_ID') && this.config.get('EMAILJS_TEMPLATE_ID') && this.config.get('EMAILJS_PUBLIC_KEY') && this.config.get('EMAILJS_PRIVATE_KEY'));
  }
}
