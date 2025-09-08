import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SeedersService {
  constructor(private prisma: PrismaService) {}

  seedUsers() {
    // Example: PrismaService is now available globally
    // You can use this.prisma.user.findMany() etc.
    console.log('Seeding users...');
    // Implementation here
  }
}
