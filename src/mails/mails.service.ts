import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SendMailDto } from './dto';
import nodemailer from 'nodemailer';

@Injectable()
export class MailsService {

  async sendMail(dto: SendMailDto) {

    try {
      const smtpUser = process.env.GMAIL_USER || process.env.MAIL_USER;
      const smtpPassword = process.env.GMAIL_PASSWORD || process.env.MAIL_PASSWORD;

      if (!smtpUser || !smtpPassword) {
        throw new InternalServerErrorException('Missing GMAIL_USER/GMAIL_PASSWORD (or MAIL_USER/MAIL_PASSWORD) in .env');
      }

      const transporter = nodemailer.createTransport({
        pool: true,
        service: process.env.MAIL_SERVICE || 'gmail',
        host: process.env.GMAIL_HOST || process.env.MAIL_HOST || undefined,
        port: process.env.GMAIL_PORT
          ? Number(process.env.GMAIL_PORT)
          : process.env.MAIL_PORT
            ? Number(process.env.MAIL_PORT)
            : undefined,
        secure:
          process.env.GMAIL_SECURE === 'true' || process.env.MAIL_SECURE === 'true',
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      await transporter.sendMail({
        from: process.env.MAIL_FROM || smtpUser,
        to: dto.to,
        subject: dto.subject,
        text: dto.text,
        html: dto.html,
        cc: dto.cc,
        bcc: dto.bcc,
        replyTo: dto.replyTo,
      })

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown SMTP error';

      if (typeof message === 'string' && (message.includes('535-5.7.8') || message.includes('BadCredentials'))) {
        throw new InternalServerErrorException(
          'Failed to send email: SMTP credentials rejected. For Gmail, use an App Password (not your normal account password).',
        );
      }

      throw new InternalServerErrorException(`Failed to send email: ${message}`);
    }

  }

}
