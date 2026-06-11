import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'medichain-secret',
    });
  }

  // Lo que devuelva validate() queda disponible como req.user en los controllers
  validate(payload: { walletAddress: string }) {
    return { walletAddress: payload.walletAddress };
  }
}
