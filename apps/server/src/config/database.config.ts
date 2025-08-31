import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DatabaseConfig {
  private prisma: PrismaClient;

  constructor(private configService: ConfigService) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.configService.get('DATABASE_URL'),
        },
      },
      log: this.configService.get('NODE_ENV') !== 'production' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  getPrismaClient(): PrismaClient {
    return this.prisma;
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
