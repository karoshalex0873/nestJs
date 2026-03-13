import { ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import * as argon from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { AuthDto } from "./dto";

import { JwtService } from "@nestjs/jwt";

@Injectable({})
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) { }

  async signIn(dto: AuthDto) {
    // steps

    // 1. find the user by email
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
      include: {
        role: true,
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

    // 3.create a access token for the user 
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.roleName,
    };

    const access_token = await this.jwtService.signAsync(payload);

    // set the cookies with the access token 
  

    const { password, ...userWithoutPassword } = user;

    return {
      message: "Signed in successfully",
      user: userWithoutPassword,
      access_token
    };
  }

  async signUp(dto: AuthDto) {
    // 1. hashing the password
    const hashedPassword = await argon.hash(dto.password);

    // 2. create and save the new user in the database
    try {
      const roleName = dto.roleName?.trim().toLowerCase() || "user";

      const role = await this.prisma.role.upsert({
        where: { roleName },
        update: {},
        create: { roleName },
      });

      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          roleId: role.role_id,
        },
        include: {
          role: true,
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
