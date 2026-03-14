import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { DomainDto, SelectDomainDto } from './dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { DomainService } from './domain.service';
import type { UserRequest } from 'src/user/types';

@Controller('domain')
export class DomainController {
  constructor(
    private domainService: DomainService
  ) { }
  // service to to add new domain in the system
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Post('create')
  addDomain(@Body() dto: DomainDto) {
    return this.domainService.addDomain(dto)
  }
  
  // upadate function
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('update/:domain_id')
  updateDomain(@Param('domain_id', new ParseUUIDPipe()) domainId: string, @Body() dto: DomainDto) {
    return this.domainService.updateDomain(dto, domainId);
  }


  // delete function
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('delete/:domain_id')
  deleteDomain(
    @Param('domain_id', new ParseUUIDPipe()) domainId: string,
  ) {
    return this.domainService.deleteDomain(domainId);
  }

  // get all domains
  @UseGuards(AuthGuard)
  @Get('getAll')
  getDomain(){
    return this.domainService.getDomain()
  }


  // function of user selecting a domain
  @UseGuards(AuthGuard)
  @Post('select')
  selectDomain(@Req() req: UserRequest, @Body() dto: SelectDomainDto){
    return this.domainService.selectDomain(req.user.sub, dto.domainId)
  }
  
}
