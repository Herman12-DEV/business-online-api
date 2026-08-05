// 1. Les imports
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// 2. Le décorateur Controller
@Controller('auth')
export class AuthController {

  // 3. Injection du service
  constructor(private authService: AuthService) {}

  // 4. Route register — à toi de compléter
  @Post('register')
  register(@Body() dto: RegisterDto) {
    // que doit retourner cette fonction ?
    // indice : authService a une méthode register()
    return this.authService.register(dto);
  }

  // 5. Route login — à toi de compléter
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
    // même logique
  }
}