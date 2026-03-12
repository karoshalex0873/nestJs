import { BadRequestException, Injectable } from '@nestjs/common';
import { RoleDto } from './dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
  ) { }

  async assignRoles(dto: RoleDto) {
    const { roleId, userId } = dto;

    if (!roleId) {
      throw new BadRequestException('Role ID is required');
    }

    const role = await this.prisma.role.findUnique({
      where: { role_id: roleId },
      select: { role_id: true },
    });

    if (!role) {
      throw new BadRequestException('Invalid roleId: role not found');
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: userId } },
    });

    if (users.length === 0) {
      throw new BadRequestException('No users found for the provided userId values');
    }

    const updatedUser = await Promise.all(
      users.map((user) =>
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            roleId,
          },
        }),
      ),
    );

    // return updatedUser; without password
    return updatedUser.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
  }
}