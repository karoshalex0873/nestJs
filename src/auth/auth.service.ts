import { ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import * as argon from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { AuthDto } from "./dto";

@Injectable({})
export class AuthService {
  constructor(private prisma: PrismaService) { }

  async signIn(dto: AuthDto) {
    // steps

    // 1. find the user by email
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new ForbiddenException("Credentials incorrect");
    }

    // 2. compare the password with the hashed password in the database
    const isPasswordValid = await argon.verify(user.password, dto.password);

    if (!isPasswordValid) {
      throw new ForbiddenException("Credentials incorrect");
    }

    const { password, ...userWithoutPassword } = user;

    return {
      message: "Signed in successfully",
      user: userWithoutPassword,
    };
  }

  async signUp(dto: AuthDto) {
    // 1. hashing the password
    const hashedPassword = await argon.hash(dto.password);

    // 2. create and save the new user in the database
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
        },
      });

      const { password, ...userWithoutPassword } = user;

      return {
        message: "Signed up successfully",
        user: userWithoutPassword
      };
    } catch {
      throw new ConflictException("Email already in use");
    }
  }
}
