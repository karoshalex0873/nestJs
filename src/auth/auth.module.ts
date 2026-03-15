import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    // prisma module 
    PrismaModule,
    // jwt module
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      global:true,
      signOptions: {
        expiresIn: '30d',
      }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule { } 
