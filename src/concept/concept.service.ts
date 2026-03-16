import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class ConceptService {
  
  constructor (
    // 1. ai service 
    private aiService: AiService,
    //  2. prisma service
    private prismaService:PrismaService
  ) {}

}

