import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorador para extraer la walletAddress del JWT verificado.
 * Uso: @WalletAddress() wallet: string
 */
export const WalletAddress = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.walletAddress;
  },
);
