import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesService } from './roles.service';
import { RoleDto } from './dto';

@Controller('role')
export class RolesController {
  constructor(private  rolesService: RolesService) { }
  // TODO: implement roles management
  
  // 1. assign roles to users
  @UseGuards(AuthGuard)
  @Patch('assign')
  assignRoles(@Body() dto:RoleDto) {
    return this.rolesService.assignRoles(dto);
  }
}
