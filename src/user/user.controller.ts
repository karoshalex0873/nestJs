import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import type { UserRequest } from './types';
import { UserService } from './user.service';
import { UpdatePasswordDto, UserDto } from './dto';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) { }


  @UseGuards(AuthGuard)
  @Get('get/me')
  getMe(@Req() req: UserRequest) {
    return this.userService.getMe(req.user.sub);
  }

  // user updates profiles to be managed here
  // 1. Update profile (firstName, email, lastName and update the profile of the logged in user)
  @UseGuards(AuthGuard)
  @Patch('update/me')
  updateProfile(@Req() req: UserRequest, @Body() dto: UserDto) {
    return this.userService.updateProfile(req.user.sub, dto);
  }
  // 2. Update password (current password, new password and update the password of the logged in user)  and also send code to email for password reset 
  
  @Patch('update/password')
  updatePassword(
    @Req() req: UserRequest,
    @Body() dto: UpdatePasswordDto
  ) {
    return this.userService.updatePassword(req.user.sub, dto);
  }
}
