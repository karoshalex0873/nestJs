import { Module } from '@nestjs/common';
import { ConceptService } from './concept.service';
import { ConceptController } from './concept.controller';

@Module({
  providers: [ConceptService],
  controllers: [ConceptController]
})
export class ConceptModule {}
