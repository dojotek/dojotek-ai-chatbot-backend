import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
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
    private rolesService: RolesService,
  ) {}

  async seedRoles(): Promise<void> {
    console.log('🌱 Starting role seeding...');

    const rolesToCreate = [
      {
        name: 'Super Admin',
        description: 'Role with full system access',
        permissions: {
          roles: ['create', 'read', 'update', 'delete'],
          users: ['create', 'read', 'update', 'delete'],
          settings: ['create', 'read', 'update', 'delete'],
          knowledges: ['create', 'read', 'update', 'delete'],
          knowledgeFiles: ['create', 'read', 'update', 'delete'],
          customers: ['create', 'read', 'update', 'delete'],
          customerStaffs: ['create', 'read', 'update', 'delete'],
          customerStaffIdentities: ['create', 'read', 'update', 'delete'],
          chatAgents: ['create', 'read', 'update', 'delete'],
          chatAgentKnowledges: ['create', 'read', 'update', 'delete'],
          chatSessions: ['create', 'read', 'update', 'delete'],
          chatMessages: ['create', 'read', 'update', 'delete'],
        },
      },
      {
        name: 'Operational',
        description: 'Operational role with basic access',
        permissions: {
          roles: ['read'],
          users: ['read'],
          settings: ['read'],
          knowledges: ['read'],
          knowledgeFiles: ['read'],
          customers: ['read'],
          customerStaffs: ['read'],
          customerStaffIdentities: ['read'],
          chatAgents: ['read'],
          chatAgentKnowledges: ['read'],
          chatSessions: ['read'],
          chatMessages: ['read'],
        },
      },
    ];

    console.log(`📝 Creating ${rolesToCreate.length} roles...`);

    // Create roles one by one to handle potential conflicts
    for (const roleData of rolesToCreate) {
      try {
        const role = await this.rolesService.create(roleData);
        console.log(`✅ Created role: ${role.name}`);
      } catch (error) {
        if (
          isErrorWithMessage(error) &&
          error.message.includes('already exists')
        ) {
          console.log(
            `⚠️  Role already exists: ${roleData.name} - Skipping...`,
          );
        } else {
          const errorMessage = isErrorWithMessage(error)
            ? error.message
            : 'Unknown error';
          console.error(
            `❌ Failed to create role ${roleData.name}:`,
            errorMessage,
          );
        }
      }
    }

    console.log('🎉 Role seeding completed!');
  }

  async seedUsers(): Promise<void> {
    console.log('🌱 Starting user seeding...');

    // First, get all roles from the database
    const allRoles = await this.rolesService.findMany({});

    if (allRoles.length === 0) {
      console.log('⚠️  No roles found. Please seed roles first.');
      return;
    }

    const password = 'dojotek888999';
    const emailDomain = 'dojotek.net';

    const usersToCreate = [];

    // Generate users for each role
    for (const role of allRoles) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const fullName = `${firstName} ${lastName} (${role.name})`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${emailDomain}`;

      usersToCreate.push({
        name: fullName,
        email: email,
        password: password,
        roleId: role.id,
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
