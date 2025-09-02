import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DatabaseConfig {
  private prisma: PrismaClient;

  constructor(private configService: ConfigService | undefined) {
    const databaseUrl = this.configService?.get?.('DATABASE_URL') ?? process.env.DATABASE_URL;
    const nodeEnv = this.configService?.get?.('NODE_ENV') ?? process.env.NODE_ENV;

    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: nodeEnv !== 'production' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  getPrismaClient(): PrismaClient {
    return this.prisma;
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
