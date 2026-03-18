import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ConceptService } from './concept.service';
import { AuthGuard } from 'src/auth/auth.guard';
import type { UserRequest } from 'src/user/types';

@Controller('concept')
export class ConceptController {
  constructor(
    private conceptService: ConceptService
  ) { }

  // method to a add a concept for learning a
  @UseGuards(AuthGuard)
  @Post('create')
  createConcept(@Req() req:UserRequest) {
    return this.conceptService.createConcept(req.user.sub)
  }

  // method to get the concept for the logging user 
  @UseGuards(AuthGuard)
  @Get('get')
  getConcept(@Req() req:UserRequest) {
    return this.conceptService.getConcept(req.user.sub)
  }
}
