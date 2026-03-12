import { BadRequestException, Injectable } from '@nestjs/common';
import { RoleDto } from './dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async assignRoles(dto: RoleDto) {
    const { roleId, userId } = dto;

    if (!roleId) {
      throw new BadRequestException('Role ID is required');
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: userId } },
    });

    const usersWithoutRole = users.filter((u) => !u.roleId);

    if (usersWithoutRole.length === 0) {
      throw new BadRequestException('No users found without a role');
    }

    const updatedUser = await Promise.all(
      usersWithoutRole.map((user) =>
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            roleId,
          },
        }),
      ),
    );

    return updatedUser;
  }
}