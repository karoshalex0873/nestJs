import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesService } from './roles.service';
import { RoleDto } from './dto';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Controller('role')
export class RolesController {
  constructor(private  rolesService: RolesService) { }
  // TODO: implement roles management
  
  // 1. assign roles to users
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('assign')
  assignRoles(@Body() dto:RoleDto) {
    return this.rolesService.assignRoles(dto);
  }
}
