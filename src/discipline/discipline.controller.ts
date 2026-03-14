import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { DisciplineService } from './discipline.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { DisciplineDto, SelectDisciplineDto, UpdateDisciplineDto } from './dto';
import type { UserRequest } from 'src/user/types';

@Controller('discipline')
export class DisciplineController {
  constructor(private readonly disciplineService: DisciplineService) { }

  // add discipline  for a domain
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Post('create')
  createDiscipline(@Body() dto: DisciplineDto) {
    return this.disciplineService.createDiscipline(dto)
  }

  // get all disciplines for a domain
  @UseGuards(AuthGuard)
  @Get('getAll')
  getDisciplines() {
    return this.disciplineService.getDisciplines()
  }

  // get a discipline by id
  @UseGuards(AuthGuard)
  @Get('get/:discipline_id')
  getDisciplineById(@Param('discipline_id', new ParseUUIDPipe()) disciplineId: string) {
    return this.disciplineService.getDisciplineById(disciplineId)
  }

  // update a discipline by id
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('update/:discipline_id')
  updateDiscipline(@Param('discipline_id', new ParseUUIDPipe()) disciplineId: string, @Body() dto: UpdateDisciplineDto) {
    return this.disciplineService.updateDiscipline(disciplineId, dto)
  }

  // delete a discipline by id
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('delete/:discipline_id')
  deleteDiscipline(@Param('discipline_id', new ParseUUIDPipe()) disciplineId: string) {
    return this.disciplineService.deleteDiscipline(disciplineId)
  }

  // select a discipline for a the logged in user
  @UseGuards(AuthGuard)
  @Post('select')
  selectDiscipline(@Req() req: UserRequest, @Body() dto: SelectDisciplineDto) {
    return this.disciplineService.selectDiscipline(req.user.sub, dto.disciplineId)
  }

}
