import { ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import * as argon from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { AuthDto } from "./dto";

@Injectable({})
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async signIn(dto: AuthDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new ForbiddenException("Credentials incorrect");
    }

    const isPasswordValid = await argon.verify(user.password, dto.password);

    if (!isPasswordValid) {
      throw new ForbiddenException("Credentials incorrect");
    }

    return {
      message: "Signed in successfully",
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async signUp(dto: AuthDto) {
    const hashedPassword = await argon.hash(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
        },
      });

      return {
        message: "Signed up successfully",
        user: {
          id: user.id,
          email: user.email,
        },
      };
    } catch {
      throw new ConflictException("Email already in use");
    }
  }
}
