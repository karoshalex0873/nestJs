import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DomainDto } from './dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DomainService {
  // constructors 
  constructor(
    private prisma: PrismaService
  ) { }

  // async function of the of 
  async addDomain(dto: DomainDto) {

    try {
      const domanin = await this.prisma.domain.create({
        data: {
          name: dto.name,
          description: dto.description,
        }
      })

      return domanin
    } catch (error) {
      throw new ConflictException("Failed to domain already exists")
    }

  }

  // async function to update the doman
  async updateDomain(dto: DomainDto, domainId: string) {
    // 1. find the doman 
    try {
      const updatedDomain = await this.prisma.domain.update({
        where: {
          id: domainId
        },
        data: {
          name: dto.name,
          description: dto.description
        }
      })

      return updatedDomain
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Domain not found');
      }

      if (error.code === 'P2002') {
        throw new ConflictException('Domain name already exists');
      }

      throw error
    }
  }

  async deleteDomain(domainId: string) {
    try {
      const domainExist = await this.prisma.domain.findUnique({
        where: {
          id: domainId
        }
      })
      if (!domainExist) {
        throw new NotFoundException("Domain not found")
      }

      // delete operation
      const deletedDomain = await this.prisma.domain.delete({
        where: {
          id: domainId
        }
      })
      return {
        message: `Domain ${deletedDomain.name} deleted succefully`
      }

    } catch (error) {
      throw new ConflictException("something went wrong !!")
    }
  }

  // get all domain
  async getDomain() {
    try {
      // 1. get all domain 


      const allDomain = await this.prisma.domain.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          users: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          disciplines: {
            select: {
              name: true,
            },
          },
        }
      })


      return allDomain
    } catch (error) {
      throw new ConflictException(`something went wrong ${error}`)
    }
  }

  async selectDomain(userId: string, domainId: string) {

    // 1. Check if domain exists
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId }
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    // 2. Check if user already selected this domain
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { domains: true }
    });

    const alreadySelected = user?.domains.some(
      (d) => d.id === domainId
    );

    if (alreadySelected) {
      return {
        message: ` ${domain.name} domain already selected`
      };
    }

    // 3. Connect domain to user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        domains: {
          connect: { id: domainId }
        }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: {
          select: {
            roleName: true
          }
        },
        domains: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return {
      message: 'Domain selected successfully',
      selectedDomain: domain,
      user: updatedUser
    };
  }
}

