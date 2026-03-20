import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ProjectService } from './project.service';
import { AuthGuard } from 'src/auth/auth.guard';
import type { UserRequest } from 'src/user/types';
import { UpdateProjectProgressDto } from './dto';

@Controller('project')
export class ProjectController {
    // controller to handle project related endpoints, such as creating a project, fetching project details, etc.

    constructor(
        private projectService: ProjectService
    ) { }

    // Impelement endpoints for project management here, such as:

    // - Create a new  Major project based on the user framework

    @UseGuards(AuthGuard)
    @Post('create')
    createProject(@Req() req: UserRequest) {
        return this.projectService.createMainProject(req.user.sub)
    }

    // - Fetch project details for the user
    @UseGuards(AuthGuard)
    @Get('details')
    getProjectDetails(@Req() req: UserRequest) {
        return this.projectService.getProjectDetails(req.user.sub)
    }


    // - Update project progress, such as marking steps as completed, adding notes, etc.
    @UseGuards(AuthGuard)
    @Post('update-progress')
    updateProjectProgress(@Req() req: UserRequest, @Body() dto: UpdateProjectProgressDto) {
        return this.projectService.updateProjectProgress(req.user.sub, dto)
    }

    // get project progress for the user
    @UseGuards(AuthGuard)
    @Get('progress')
    getProjectProgress(@Req() req: UserRequest) {
        return this.projectService.getProjectProgress(req.user.sub)
    }
}
