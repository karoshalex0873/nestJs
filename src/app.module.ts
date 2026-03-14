import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { BookmarkModule } from './bookmark/bookmark.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { MailsModule } from './mails/mails.module';
import { RolesModule } from './roles/roles.module';
import { DomainModule } from './domain/domain.module';
import { DisplineModule } from './displine/displine.module';

@Module({
  imports: [

    // config module - to load env variables and make them available globally
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    RolesModule,
    UserModule,
    BookmarkModule,
    PrismaModule,
    MailsModule,
    DomainModule,
    DisplineModule],
})
export class AppModule { }
