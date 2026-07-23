import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ethers } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly blockchainService: BlockchainService,
  ) {}

  async getNonce(walletAddress: string): Promise<{ nonce: string }> {
    const address = walletAddress.toLowerCase();

    let profile = await this.prisma.userProfile.findUnique({
      where: { walletAddress: address },
    });

    if (!profile) {
      profile = await this.prisma.userProfile.create({
        data: {
          walletAddress: address,
          name: '',
          nonce: randomUUID(),
        },
      });
    }

    return { nonce: profile.nonce };
  }

  async verify(
    walletAddress: string,
    signature: string,
  ): Promise<{ accessToken: string }> {
    const address = walletAddress.toLowerCase();

    const profile = await this.prisma.userProfile.findUnique({
      where: { walletAddress: address },
    });

    if (!profile) {
      throw new UnauthorizedException('Wallet no encontrada');
    }

    //verificar que la firma corresponde al nonce y a esta wallet
    const message = `MediChain login: ${profile.nonce}`;
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature).toLowerCase();
    } catch {
      throw new UnauthorizedException('Firma inválida');
    }

    if (recoveredAddress !== address) {
      throw new UnauthorizedException('La firma no corresponde a esta wallet');
    }

    //regenerar el nonce para que la firma no pueda reutilizarse
    await this.prisma.userProfile.update({
      where: { walletAddress: address },
      data: { nonce: randomUUID() },
    });

    const token = this.jwtService.sign({ walletAddress: address });
    return { accessToken: token };
  }

  async updateProfile(
    walletAddress: string,
    data: { name?: string; lastName?: string; email?: string; role?: number; specialty?: string },
  ) {
    const address = walletAddress.toLowerCase();
    const { role: requestedRole, ...rest } = data;

    if (requestedRole === undefined) {
      return this.prisma.userProfile.update({ where: { walletAddress: address }, data: rest });
    }

    const onChainRole = await this.blockchainService.getOnChainRole(address);
    if (onChainRole === null) {
      throw new ForbiddenException('Esta wallet todavía no está registrada en UserRegistry');
    }
    if (onChainRole !== requestedRole) {
      throw new ForbiddenException('El rol enviado no coincide con el rol registrado on-chain');
    }

    return this.prisma.userProfile.update({
      where: { walletAddress: address },
      data: { ...rest, role: onChainRole },
    });
  }

  async getPublicProfile(walletAddress: string) {
    return this.prisma.userProfile.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      select: { walletAddress: true, name: true, lastName: true, specialty: true },
    });
  }

  async getUsersByRole(role: number) {
    const profiles = await this.prisma.userProfile.findMany({
      where: { role, name: { not: "" } },
      select: { walletAddress: true, name: true, lastName: true, specialty: true },
      orderBy: [{ name: "asc" }, { lastName: "asc" }],
    });
    if (profiles.length === 0) return profiles;

    const approved = await this.blockchainService.filterApprovedAddresses(
      profiles.map((p) => p.walletAddress),
    );
    return profiles.filter((p) => approved.has(p.walletAddress.toLowerCase()));
  }

  async getProfile(walletAddress: string) {
    return this.prisma.userProfile.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });
  }
}
