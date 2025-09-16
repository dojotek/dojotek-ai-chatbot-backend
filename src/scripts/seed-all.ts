#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedersService } from '../seeders/seeders.service';

async function bootstrap() {
  console.log('🚀 Starting Dojotek AI Chatbot Complete Seeder...');

  try {
    // Create the NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule);

    // Get the SeedersService
    const seedersService = app.get(SeedersService);

    // Run the seeding in order (roles first, then users)
    console.log('🌱 Step 1: Seeding roles...');
    await seedersService.seedRoles();

    console.log('👥 Step 2: Seeding users...');
    await seedersService.seedUsers();

    // Close the application
    await app.close();

    console.log('✨ Complete seeding process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Error during seeding process:', error);
    process.exit(1);
  }
}

void bootstrap();
