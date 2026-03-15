import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FrameworkDto, UpdateFrameworkDto } from './dto';


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

  // aysnc function to update a specific framework by ID using patch for updating even single records
  async updateFramework(frameworkId: string, dto: UpdateFrameworkDto) {
    // 1. check if the framework exists that is passed on the param
    const frameworkExist = await this.prisma.framework.findUnique({
      where: {
        id: frameworkId,
      },
    })
    if (!frameworkExist) {
      throw new NotFoundException('Framework not found');
    }

    // 2. prevent duplicate framework names (schema enforces name as unique)
    if (dto.frameworkName) {
      const frameworkWithSameName = await this.prisma.framework.findUnique({
        where: {
          name: dto.frameworkName,
        },
      });
      if (frameworkWithSameName && frameworkWithSameName.id !== frameworkId) {
        throw new ConflictException('Framework name already exists');
      }
    }

    // 3. update the framework
    const updatedFramework = await this.prisma.framework.update({
      where: {
        id: frameworkId,
      },
      data: {
        ...(dto.frameworkName !== undefined && { name: dto.frameworkName }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
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
      }
    })

    return {
      message: 'Framework updated successfully',
      framework: updatedFramework,
    }
  }

  //  async function to delete a specific framework by ID
  async deleteFramework(frameworkId: string) {
    // 1. check if the framework exists that is passed on the param
    const frameworkExist = await this.prisma.framework.findUnique({
      where: {
        id: frameworkId,
      }
    })

    if (!frameworkExist) {
      throw new NotFoundException('Framework not found');
    }

    // 2. delete the framework
    const deletedFramework = await this.prisma.framework.delete({
      where: {
        id: frameworkId
      }
    })

    return {
      message: `Framework ${deletedFramework.name} deleted successfully`
    }
  }

  // async function for a user to select a framework
  async selectFramework(userId: string, frameworkId: string) {
    // 1. check if framework exists
    const framework = await this.prisma.framework.findUnique({
      where: {
        id: frameworkId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        disciplineId: true,
        discipline: {
          select: {
            id: true,
            name: true,
            domain: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!framework) {
      throw new NotFoundException('Framework not found');
    }

    // 2. check if user exists and has selected the framework domain
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        domains: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    const hasSelectedDomain = user.domains.some(
      (domain) => domain.id === framework.discipline.domain.id,
    )

    if (!hasSelectedDomain) {
      throw new ConflictException('Select the domain first before selecting a framework')
    }

    // 3. ensure user selected the parent discipline first
    const hasSelectedDiscipline = await this.prisma.$queryRaw<Array<{ A: string; B: string }>>`
      SELECT "A", "B"
      FROM "_UserDisciplines"
      WHERE "A" = ${framework.disciplineId} AND "B" = ${userId}
      LIMIT 1
    `

    if (hasSelectedDiscipline.length === 0) {
      throw new ConflictException('Select the discipline first before selecting a framework')
    }

    // 4. prevent selecting the same framework again
    const alreadySelected = await this.prisma.$queryRaw<Array<{ A: string; B: string }>>`
      SELECT "A", "B"
      FROM "_UserFrameworks"
      WHERE "A" = ${frameworkId} AND "B" = ${userId}
      LIMIT 1
    `

    if (alreadySelected.length > 0) {
      return {
        message: `${framework.name} framework already selected`,
      }
    }

    // 5. save selection
    await this.prisma.$executeRaw`
      INSERT INTO "_UserFrameworks" ("A", "B")
      VALUES (${frameworkId}, ${userId})
    `

    const selectedFrameworks = await this.prisma.$queryRaw<Array<{ id: string; name: string; disciplineName: string; domainName: string }>>`
      SELECT f."id", f."name", d."name" AS "disciplineName", dm."name" AS "domainName"
      FROM "frameworks" f
      INNER JOIN "_UserFrameworks" uf ON uf."A" = f."id"
      INNER JOIN "disciplines" d ON d."id" = f."disciplineId"
      INNER JOIN "domains" dm ON dm."id" = d."domainId"
      WHERE uf."B" = ${userId}
      ORDER BY f."name" ASC
    `

    return {
      message: 'Framework selected successfully',
      selectedFramework: {
        id: framework.id,
        name: framework.name,
        description: framework.description,
        discipline: {
          id: framework.discipline.id,
          name: framework.discipline.name,
        },
        domain: framework.discipline.domain,
      },
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        frameworks: selectedFrameworks,
      },
    }
  }
}
