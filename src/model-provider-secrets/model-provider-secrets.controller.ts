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
import { ModelProviderSecretsService } from './model-provider-secrets.service';
import { CreateModelProviderSecretDto } from './dto/create-model-provider-secret.dto';
import { UpdateModelProviderSecretDto } from './dto/update-model-provider-secret.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ModelProviderSecret } from './entities/model-provider-secret.entity';
import { Prisma } from '../generated/prisma/client';

@ApiTags('model-provider-secrets')
@ApiBearerAuth()
@Controller('model-provider-secrets')
export class ModelProviderSecretsController {
  constructor(
    private readonly modelProviderSecretsService: ModelProviderSecretsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new model provider secret' })
  @ApiResponse({
    status: 201,
    description: 'Secret created',
    type: ModelProviderSecret,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(
    @Body(ValidationPipe)
    createModelProviderSecretDto: CreateModelProviderSecretDto,
  ) {
    return this.modelProviderSecretsService.create(
      createModelProviderSecretDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all model provider secrets' })
  @ApiResponse({
    status: 200,
    description: 'Return all secrets',
    type: [ModelProviderSecret],
  })
  findAll(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    const where: Prisma.ModelProviderSecretWhereInput = {};
    if (type) {
      where.type = { contains: type, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.modelProviderSecretsService.findAll({
      skip,
      take: take || 10,
      where: Object.keys(where).length ? where : undefined,
      orderBy: {
        createdAt: 'desc',
      } as Prisma.ModelProviderSecretOrderByWithRelationInput,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a secret by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the secret',
    type: ModelProviderSecret,
  })
  @ApiResponse({ status: 404, description: 'Secret not found' })
  findOne(@Param('id') id: string) {
    return this.modelProviderSecretsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a secret' })
  @ApiResponse({
    status: 200,
    description: 'Secret updated',
    type: ModelProviderSecret,
  })
  @ApiResponse({ status: 404, description: 'Secret not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe)
    updateModelProviderSecretDto: UpdateModelProviderSecretDto,
  ) {
    return this.modelProviderSecretsService.update(
      id,
      updateModelProviderSecretDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a secret' })
  @ApiResponse({ status: 204, description: 'Secret deleted' })
  @ApiResponse({ status: 404, description: 'Secret not found' })
  async remove(@Param('id') id: string) {
    await this.modelProviderSecretsService.remove(id);
  }
}
