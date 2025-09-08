import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { faker } from '@faker-js/faker';

interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

@Injectable()
export class SeedersService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async seedUsers(): Promise<void> {
    console.log('🌱 Starting user seeding...');

    const roles = ['Director', 'Head', 'Manager', 'Lead', 'Operational'];
    const password = 'dojotek888999';
    const emailDomain = 'dojotek.net';

    const usersToCreate = [];

    // Generate users for each role
    for (const role of roles) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const fullName = `${firstName} ${lastName} (${role})`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${emailDomain}`;

      usersToCreate.push({
        name: fullName,
        email: email,
        password: password,
      });
    }

    console.log(`📝 Creating ${usersToCreate.length} users...`);

    // Create users one by one to handle potential conflicts
    for (const userData of usersToCreate) {
      try {
        const user = await this.usersService.create(userData);
        console.log(`✅ Created user: ${user.name} (${user.email})`);
      } catch (error) {
        if (
          isErrorWithMessage(error) &&
          error.message.includes('already exists')
        ) {
          console.log(
            `⚠️  User already exists: ${userData.email} - Skipping...`,
          );
        } else {
          const errorMessage = isErrorWithMessage(error)
            ? error.message
            : 'Unknown error';
          console.error(
            `❌ Failed to create user ${userData.email}:`,
            errorMessage,
          );
        }
      }
    }

    console.log('🎉 User seeding completed!');
  }
}
