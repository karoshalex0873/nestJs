import { Module } from '@nestjs/common';
import { ConceptModule } from 'src/concept/concept.module';
import { ProjectModule } from 'src/project/project.module';
import { FrameworkController } from './framework.controller';
import { FrameworkService } from './framework.service';
@Module({
  controllers: [FrameworkController],
  providers: [FrameworkService],
  imports: [ConceptModule, ProjectModule]
})
export class FrameworkModule {}
