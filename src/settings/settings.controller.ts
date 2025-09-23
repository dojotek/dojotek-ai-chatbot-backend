import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  ValidationPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { Setting } from './entities/setting.entity';
import { Prisma } from '../generated/prisma/client';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new setting' })
  @ApiResponse({
    status: 201,
    description: 'The setting has been successfully created.',
    type: Setting,
  })
  @ApiResponse({ status: 409, description: 'Setting key already exists.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(
    @Body(ValidationPipe) createSettingDto: CreateSettingDto,
  ): Promise<Setting> {
    return this.settingsService.create(createSettingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all settings' })
  @ApiResponse({
    status: 200,
    description: 'Return all settings (Sensitive values redacted).',
    type: [Setting],
  })
  async findAll(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ): Promise<Setting[]> {
    const conditions: Prisma.SettingWhereInput[] = [];
    if (search) {
      conditions.push({
        OR: [
          { key: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (category) {
      conditions.push({ category: { equals: category } });
    }

    const where: Prisma.SettingWhereInput | undefined = conditions.length
      ? { AND: conditions }
      : undefined;

    return this.settingsService.findMany({
      skip,
      take: take ?? 10,
      where,
      orderBy: { createdAt: 'desc' },
      redactSensitive: true,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a setting by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the setting (Sensitive value redacted).',
    type: Setting,
  })
  @ApiResponse({ status: 404, description: 'Setting not found.' })
  async findOne(@Param('id') id: string): Promise<Setting | null> {
    return this.settingsService.findOne({ id }, true);
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Get a setting by key' })
  @ApiResponse({
    status: 200,
    description: 'Return the setting (Sensitive value redacted).',
    type: Setting,
  })
  @ApiResponse({ status: 404, description: 'Setting not found.' })
  async findByKey(@Param('key') key: string): Promise<Setting | null> {
    return this.settingsService.findOne({ key }, true);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a setting' })
  @ApiResponse({
    status: 200,
    description: 'The setting has been successfully updated.',
    type: Setting,
  })
  @ApiResponse({ status: 404, description: 'Setting not found.' })
  @ApiResponse({ status: 409, description: 'Setting key already exists.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateSettingDto: UpdateSettingDto,
  ): Promise<Setting> {
    return this.settingsService.update({ id }, updateSettingDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a setting' })
  @ApiResponse({
    status: 204,
    description: 'The setting has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Setting not found.' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.settingsService.delete({ id });
  }
}
