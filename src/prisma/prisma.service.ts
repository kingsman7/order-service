
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = process.env.DATABASE_URL
    
    // Si estás usando el adapter de Postgres
    const adapter = new PrismaPg({ connectionString: url });

    super({
      adapter,
    });
  }
  async onModuleInit() {
    await this.$connect();
    console.log('🔌 Conectado exitosamente a PostgreSQL (Orders DB) desde NestJS');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}