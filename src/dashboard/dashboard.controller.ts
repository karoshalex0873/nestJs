import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import type { UserRequest } from 'src/user/types';
import { GenerateRoadmapDto } from './dto/roadmap.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(AuthGuard)
  @Get('overview')
  getOverview(@Req() req: UserRequest) {
    return this.dashboardService.getOverview(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Post('roadmap')
  generateRoadmap(@Req() req: UserRequest, @Body() dto: GenerateRoadmapDto) {
    return this.dashboardService.generateRoadmapGuide(req.user.sub, dto);
  }
}
