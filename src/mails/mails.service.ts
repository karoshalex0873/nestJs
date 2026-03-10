import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SendMailDto } from './dto';
import nodemailer from 'nodemailer';

@Injectable()
export class MailsService {




  async sendMail(dto: SendMailDto) {

    try {
      const smtpUser = process.env.GMAIL_USER;
      const smtpPassword = process.env.GMAIL_PASSWORD;

      if (!smtpUser || !smtpPassword) {
        throw new InternalServerErrorException('Missing GMAIL_USER or GMAIL_PASSWORD in .env');
      }

      // For Gmail, service + auth is usually enough. Host/port can stay optional.
      const transporter = nodemailer.createTransport({
        pool: true,
        service: 'gmail',
        host: process.env.GMAIL_HOST || undefined,
        port: process.env.GMAIL_PORT ? Number(process.env.GMAIL_PORT) : undefined,
        secure: process.env.GMAIL_SECURE === 'true',
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      // send mail with defined transport object
      await transporter.sendMail({
        from: smtpUser,
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
      throw new InternalServerErrorException(`Failed to send email: ${message}`);
    }

  }

}
