import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FrameworkDto } from './dto';


@Injectable()
export class FrameworkService {
  constructor(
    private prisma: PrismaService
  ) { }
  // aync function to get all frameworks from the database for the domain selected by the user
  async getFrameworks(disciplineId: string) {

    // 1. Check if the domain exists
    const domainExist = await this.prisma.discipline.findUnique({
      where: {
        id: disciplineId
      }
    });

    if (!domainExist) {
      throw new NotFoundException('Discipline not found');
    }

    // 2. Get all frameworks for the discipline selected by the user
    return await this.prisma.framework.findMany({
      where: {
        disciplineId: disciplineId
      }
    });
  }

  // aysnc function to get a specific framework by ID selected by the user
  async getFrameworkById(frameworkId: string) {
    // 1. Check if the framework exists
    const frameworkExist = await this.prisma.framework.findUnique({
      where: {
        id: frameworkId
      },
      select: {
        id: true,
        name: true,
        description: true,
      }
    })

    if (!frameworkExist) {
      throw new NotFoundException('Framework not found');
    }

    return frameworkExist;
  }

  // aysnc function to Crete a frame work fo selected domain by the admin
  async createFramework(disciplineId: string, dto: FrameworkDto) {
    // 1. check if the discipline exists that is passed on the param
    const disciplineExist = await this.prisma.discipline.findUnique({
      where: {
        id: disciplineId,
      },
    });

    if (!disciplineExist) {
      throw new NotFoundException('Discipline not found');
    }

    // 2. prevent duplicate framework names (schema enforces name as unique)
    const frameworkExist = await this.prisma.framework.findUnique({
      where: {
        name: dto.frameworkName,
      },
    });

    if (frameworkExist) {
      throw new ConflictException('Framework name already exists');
    }

    try {
      // 3. Create the framework for the discipline
      const newFramework = await this.prisma.framework.create({
        data: {
          name: dto.frameworkName,
          description: dto.description,
          disciplineId,
        },
        // return the framework with its discipline and domain
        select: {
          id: true,
          name: true,
          description: true,
          discipline: {
            select: {
              id: true,
              name: true,
              domain: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      return {
        message: 'Framework created successfully',
        framework: newFramework,
      };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Framework name already exists');
      }

      throw error;
    }
  }
}
