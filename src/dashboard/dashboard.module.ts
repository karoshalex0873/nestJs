import { Module } from '@nestjs/common';
import { AiModule } from 'src/ai/ai.module';
import { ConceptModule } from 'src/concept/concept.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [PrismaModule, ConceptModule, AiModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
