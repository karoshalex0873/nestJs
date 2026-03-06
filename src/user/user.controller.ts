import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import type { UserRequest } from './types';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) { }


  @UseGuards(AuthGuard)
  @Get('get/me')
  getMe(@Req() req: UserRequest) {
    return this.userService.getMe(req.user.sub);
  }
}
