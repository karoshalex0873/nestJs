import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import type { AuthDto } from "./dto";

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('signup')
  signUp(@Body() dto: AuthDto) {
    console.log({
      dto: dto 
    })


    return this.authService.signUp()
  }

  @Post('signin')
  signIn() {
    return this.authService.signIn();
  }
} 