import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ConceptService } from './concept.service';
import { AuthGuard } from 'src/auth/auth.guard';
import type { UserRequest } from 'src/user/types';
import { CompleteConceptDto, EvaluateConceptDto } from './dto';

@Controller('concept')
export class ConceptController {
  constructor(
    private conceptService: ConceptService
  ) { }

  // Creates or returns today's learning concept for the user.
  @UseGuards(AuthGuard)
  @Post('create')
  createConcept(@Req() req: UserRequest) {
    return this.conceptService.createConcept(req.user.sub)
  }

  // Fetches today's concept (or creates it if missing).
  @UseGuards(AuthGuard)
  @Get('get')
  getConcept(@Req() req: UserRequest) {
    return this.conceptService.getConcept(req.user.sub)
  }

  @UseGuards(AuthGuard)
  @Get('timeline')
  getTimeline(@Req() req: UserRequest) {
    return this.conceptService.getLearningTimeline(req.user.sub)
  }

  //  Marks today's concept as completed for the user.
  @UseGuards(AuthGuard)
  @Post('complete')
  completeConcept(@Req() req: UserRequest, @Body() body: CompleteConceptDto) {
    return this.conceptService.completeConcept(req.user.sub, body)
  }

  @UseGuards(AuthGuard)
  @Post('evaluate')
  evaluateConcept(@Req() req: UserRequest, @Body() body: EvaluateConceptDto) {
    return this.conceptService.evaluateConceptAnswer(req.user.sub, body.answer)
  }
}
