import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { WalletAddress } from './wallet.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}


  //el front llama esto antes de pedir la firma, devuelve el nonce que MetaMask tiene que firmar
  @Get('nonce/:wallet')
  getNonce(@Param('wallet') wallet: string) {
    return this.authService.getNonce(wallet);
  }


  //front manda la wallet y la firma del nonce
  @Post('verify')
  verify(@Body() body: { walletAddress: string; signature: string }) {
    return this.authService.verify(body.walletAddress, body.signature);
  }


  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@WalletAddress() wallet: string) {
    return this.authService.getProfile(wallet);
  }

  //Actualiza nombre, apellido, email y rol del perfil
  @Put('profile')
  @UseGuards(AuthGuard('jwt'))
  updateProfile(
    @WalletAddress() wallet: string,
    @Body() body: { name?: string; lastName?: string; email?: string; role?: number; specialty?: string },
  ) {
    return this.authService.updateProfile(wallet, body);
  }

  //Lista usuarios por rol (para los desplegables de elegir médico / paciente).
  //Sin guard: solo devuelve nombre + address por rol, y se consume al armar los
  //desplegables antes de que el usuario tenga sesión con el backend.
  @Get('users')
  getUsersByRole(@Query('role', ParseIntPipe) role: number) {
    return this.authService.getUsersByRole(role);
  }

  //Nombre/apellido off-chain de una wallet (para mostrar junto a la address)
  @Get('profile/:wallet')
  getPublicProfile(@Param('wallet') wallet: string) {
    return this.authService.getPublicProfile(wallet);
  }
}
