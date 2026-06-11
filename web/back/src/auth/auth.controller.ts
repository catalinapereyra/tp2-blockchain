import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { WalletAddress } from './wallet.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * GET /api/auth/nonce/:wallet
   * El front llama esto antes de pedir la firma.
   * Devuelve el nonce que MetaMask tiene que firmar.
   */
  @Get('nonce/:wallet')
  getNonce(@Param('wallet') wallet: string) {
    return this.authService.getNonce(wallet);
  }

  /**
   * POST /api/auth/verify
   * El front manda la wallet y la firma del nonce.
   * Devuelve el JWT si la firma es válida.
   */
  @Post('verify')
  verify(@Body() body: { walletAddress: string; signature: string }) {
    return this.authService.verify(body.walletAddress, body.signature);
  }

  /**
   * GET /api/auth/me
   * Devuelve el perfil del usuario logueado.
   * Requiere JWT válido.
   */
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@WalletAddress() wallet: string) {
    return this.authService.getProfile(wallet);
  }

  /**
   * PUT /api/auth/profile
   * Actualiza nombre, apellido y email del perfil.
   * Requiere JWT válido.
   */
  @Put('profile')
  @UseGuards(AuthGuard('jwt'))
  updateProfile(
    @WalletAddress() wallet: string,
    @Body() body: { name?: string; lastName?: string; email?: string },
  ) {
    return this.authService.updateProfile(wallet, body);
  }
}
