import { Controller, Get, Param, ParseUUIDPipe, UseGuards, Post, Body, Patch, Delete, Req } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { FrameworkService } from './framework.service';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { FrameworkDto, UpdateFrameworkDto } from './dto';
import type { UserRequest } from 'src/user/types';

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
  // 4. PUT /frameworks/:id - Update a spPecific framework by ID using patch for updating even single records
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('update/:framework_id')
  updateFramework(@Param('framework_id', new ParseUUIDPipe()) frameworkId: string, @Body() dto: UpdateFrameworkDto) {
    // Call the service to update a specific framework by ID
    return this.frameworkService.updateFramework(frameworkId, dto);
  }
  
  // 5. DELETE /frameworks/:id - Delete a specific framework by ID
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('delete/:framework_id')
  deleteFramework(@Param('framework_id', new ParseUUIDPipe()) frameworkId: string) {
    // Call the service to delete a specific framework by ID
    return this.frameworkService.deleteFramework(frameworkId);
  }

  // 6. SELECT /frameworks/:id - Select a specific framework by ID for the user
  @UseGuards(AuthGuard)
  @Post('select/:framework_id')
  selectFramework(@Req() req:UserRequest ,@Param('framework_id', new ParseUUIDPipe()) frameworkId: string) {
    // Call the service to select a specific framework by ID for the user
    return this.frameworkService.selectFramework(req.user.sub, frameworkId);
  }
}
