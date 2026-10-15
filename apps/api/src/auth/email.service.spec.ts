import {ServiceUnavailableException} from '@nestjs/common';
import {EmailService} from './email.service';

describe('production email configuration', () => {
  it('never exposes confirmation links through development previews in production', async () => {
    const config = {get: (key: string) => ({NODE_ENV: 'production', DEV_AUTH_ENABLED: 'true'}[key])};
    const service = new EmailService(config as never);
    expect(service.developmentPreviewEnabled()).toBe(false);
    await expect(service.send({to: 'owner@example.com', toName: 'Owner', subject: 'Confirm', text: 'Confirm email', actionUrl: 'https://example.com/confirm', actionLabel: 'Confirm'})).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
