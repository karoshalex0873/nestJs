import { IsEmail, IsString} from "class-validator";

//  DTO for sending emails
export class SendMailDto {
  @IsString()
  @IsEmail()
  to: string | string[];

  @IsString()
  subject: string;
  @IsString()
  text?: string;
  @IsString()
  html?: string;
  @IsEmail()
  cc?: string | string[];
  @IsEmail()
  bcc?: string | string[];
  @IsEmail()
  @IsString()
  replyTo?: string;
}

