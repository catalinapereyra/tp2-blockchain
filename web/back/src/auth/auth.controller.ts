import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
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

  //Actualiza nombre, apellido y email del perfil
  @Put('profile')
  @UseGuards(AuthGuard('jwt'))
  updateProfile(
    @WalletAddress() wallet: string,
    @Body() body: { name?: string; lastName?: string; email?: string },
  ) {
    return this.authService.updateProfile(wallet, body);
  }
}
