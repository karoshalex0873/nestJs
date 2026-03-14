import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DisciplineDto, UpdateDisciplineDto } from './dto';

@Injectable()
export class DisciplineService {
  // constructors
  constructor(
    private prisma: PrismaService
  ) { }


  // 1. async function to create a discipline for a domain
  async createDiscipline(dto: DisciplineDto) {

    // 1. check if the domain exists
    const domainExist = await this.prisma.domain.findUnique({
      where: {
        id: dto.domainId,
      }
    })

    if (!domainExist) {
      throw new NotFoundException('Domain not found')
    }

    // 2. check if the discipline already exists for the domain
    const disciplineExist = await this.prisma.discipline.findFirst({
      where: {
        name: dto.disciplineName,
        domainId: dto.domainId,
      }
    })

    if (disciplineExist) {
      throw new ConflictException('Discipline already exists for the domain')
    }


    // 3. create the discipline for the domain
    const discipline = await this.prisma.discipline.create({
      data: {
        name: dto.disciplineName,
        description: dto.description,
        domainId: dto.domainId,
      },
      select: {
        id: true,
        name: true,
        domain: {
          select: {
            id: true,
            name: true
          }
        }

      }
    })

    // 4. return the created discipline
    return {
      message: 'Discipline created successfully',
      discipline: discipline
    }
  }

  // 2. async function to get all disciplines for a domain
  async getDisciplines() {
    // 1. get all disciplines for a domain
    const disciplines = await this.prisma.discipline.findMany({
      select: {
        // selecting the fields to return
        id: true,
        name: true,
        description: true,
        // selecting the domain name and id for each discipline
        domain: {
          select: {
            id: true,
            name: true
          }
        },
      }
    })
    return {
      message: "Disciplines retrieved successfully",
      disciplines: disciplines.sort((a, b) => a.name.localeCompare(b.name)) // sort the disciplines by name
    }
  }

  // 3. async function to get a discipline by id
  async getDisciplineById(disciplineId: string) {
    // 1. check if the discipline exists 
    const disciplineExist = await this.prisma.discipline.findUnique({
      where: {
        id: disciplineId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        domain: {
          select: {
            name: true
          }
        }
      }
    })

    if (!disciplineExist) {
      throw new NotFoundException('Discipline not found')
    }

    return {
      message: 'Discipline retrieved successfully',
      discipline: disciplineExist
    }
  }

  // 4. async function to update a discipline by id
  async updateDiscipline(disciplineId: string, dto: UpdateDisciplineDto) {
    // 1. check if the discipline exists
    const disciplineExist = await this.prisma.discipline.findUnique({
      where: {
        id: disciplineId,
      }
    })

    if (!disciplineExist) {
      throw new NotFoundException('Discipline not found')
    }

    if (dto.domainId) {
      const domainExist = await this.prisma.domain.findUnique({
        where: {
          id: dto.domainId,
        },
      })

      if (!domainExist) {
        throw new NotFoundException('Domain not found')
      }
    }

    const nextDomainId = dto.domainId ?? disciplineExist.domainId
    const nextDisciplineName = dto.disciplineName ?? disciplineExist.name

    if (dto.domainId !== undefined || dto.disciplineName !== undefined) {
      const duplicateDiscipline = await this.prisma.discipline.findFirst({
        where: {
          id: {
            not: disciplineId,
          },
          name: nextDisciplineName,
          domainId: nextDomainId,
        },
      })

      if (duplicateDiscipline) {
        throw new ConflictException('Discipline already exists for the domain')
      }
    }

    // 2. update the discipline
    const updatedDiscipline = await this.prisma.discipline.update({
      where: {
        id: disciplineId,
      },
      data: {
        ...(dto.disciplineName !== undefined && { name: dto.disciplineName }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.domainId !== undefined && { domainId: dto.domainId }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        domain: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return {
      message: 'Discipline updated successfully',
      discipline: updatedDiscipline
    }
  }

  // 5. async function to delete a discipline by id
  async deleteDiscipline(disciplineId: string) {
    // 1. check if the discipline exists
    const disciplineExist = await this.prisma.discipline.findUnique({
      where: {
        id: disciplineId,
      }
    })

    if (!disciplineExist) {
      throw new NotFoundException('Discipline not found')
    }

    // 2. delete the discipline
    const deletedDiscipline = await this.prisma.discipline.delete({
      where: {
        id: disciplineId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        domain: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return {
      message: 'Discipline deleted successfully',
      discipline: deletedDiscipline
    }
  }

  // 6. async function to select a discipline for a user
  async selectDiscipline(userId: string, disciplineId: string) {
    const discipline = await this.prisma.discipline.findUnique({
      where: {
        id: disciplineId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        domainId: true,
        domain: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!discipline) {
      throw new NotFoundException('Discipline not found')
    }

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
      (domain) => domain.id === discipline.domainId,
    )

    if (!hasSelectedDomain) {
      throw new ConflictException('Select the domain first before selecting a discipline')
    }

    const alreadySelected = await this.prisma.$queryRaw<Array<{ A: string; B: string }>>`
      SELECT "A", "B"
      FROM "_UserDisciplines"
      WHERE "A" = ${disciplineId} AND "B" = ${userId}
      LIMIT 1
    `

    if (alreadySelected.length > 0) {
      return {
        message: `${discipline.name} discipline already selected`,
      }
    }

    await this.prisma.$executeRaw`
      INSERT INTO "_UserDisciplines" ("A", "B")
      VALUES (${disciplineId}, ${userId})
    `

    const selectedDisciplines = await this.prisma.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT d."id", d."name"
      FROM "disciplines" d
      INNER JOIN "_UserDisciplines" ud ON ud."A" = d."id"
      WHERE ud."B" = ${userId}
      ORDER BY d."name" ASC
    `

    return {
      message: 'Discipline selected successfully',
      selectedDiscipline: {
        id: discipline.id,
        name: discipline.name,
        description: discipline.description,
        domain: discipline.domain,
      },
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        disciplines: selectedDisciplines,
      },
    }
  }

}
