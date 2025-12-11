import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Test database connection on startup in development
if (process.env.NODE_ENV === 'development' && !globalForPrisma.prisma) {
  prisma.$connect()
    .then(() => {
      console.log('✅ Database connected successfully');
    })
    .catch((error) => {
      console.error('❌ Database connection failed:', error);
      console.error('Make sure DATABASE_URL is set in your .env file');
    });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
