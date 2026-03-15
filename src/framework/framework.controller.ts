import { Controller, Get, Param, ParseUUIDPipe, UseGuards, Post, Body } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { FrameworkService } from './framework.service';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { FrameworkDto } from './dto';

@Controller('framework')
export class FrameworkController {
  constructor(
    private frameworkService: FrameworkService
  ) { }

  // 1. Define the endpoints for the framework resource here
  // # functions to GET, POST, PUT, DELETE frameworks
  // 1. GET /frameworks - Get all frameworks
  @UseGuards(AuthGuard)
  @Get('getAll/:discipline_id')
  getFrameworks(
    @Param('discipline_id', new ParseUUIDPipe()) disciplineId: string
  ) {
    // Call the service to get all frameworks
    return this.frameworkService.getFrameworks(disciplineId);
  }
  // 2. GET /frameworks/:id - Get a specific framework by ID selected by the user
  @UseGuards(AuthGuard)
  @Get('get/:framework_id')
  getFrameworkById(
    @Param('framework_id', new ParseUUIDPipe()) frameworkId: string
  ) {
    // Call the service to get a specific framework by ID
    return this.frameworkService.getFrameworkById(frameworkId);
  }

  // 3. POST /frameworks - Create a new framework by admin only
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Post('create/:discipline_id')
  createFramework(@Param('discipline_id', new ParseUUIDPipe()) disciplineId: string, @Body() dto: FrameworkDto) {
    // Call the service to create a new framework
    return this.frameworkService.createFramework(disciplineId, dto);
  }
  // 4. PUT /frameworks/:id - Update a spPecific framework by ID
  // 5. DELETE /frameworks/:id - Delete a specific framework by ID
  // 6. SELECT /frameworks/:id - Select a specific framework by ID for the user

}
