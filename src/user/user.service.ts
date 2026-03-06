import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // get me service
  async getMe(userId: string) {
    // 1. get user from the db of logged in user
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        roles: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. return the user
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

