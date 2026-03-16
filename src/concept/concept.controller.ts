import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ConceptService } from './concept.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('concept')
export class ConceptController {
  constructor(
    private conceptService: ConceptService
  ) { }

  // method to a add a concept for learning a
  @UseGuards(AuthGuard)
  @Post('create')
  developConcept() {
    return ``
  }
}
