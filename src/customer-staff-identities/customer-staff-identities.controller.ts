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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomerStaffIdentitiesService } from './customer-staff-identities.service';
import { CreateCustomerStaffIdentityDto } from './dto/create-customer-staff-identity.dto';
import { UpdateCustomerStaffIdentityDto } from './dto/update-customer-staff-identity.dto';
import { CustomerStaffIdentity } from './entities/customer-staff-identity.entity';
import { Prisma } from '../generated/prisma/client';

@ApiTags('customer-staff-identities')
@ApiBearerAuth()
@Controller('customer-staff-identities')
export class CustomerStaffIdentitiesController {
  constructor(
    private readonly customerStaffIdentitiesService: CustomerStaffIdentitiesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new customer staff identity' })
  @ApiResponse({
    status: 201,
    description: 'The customer staff identity has been successfully created.',
    type: CustomerStaffIdentity,
  })
  @ApiResponse({
    status: 409,
    description: 'Customer staff identity field already exists.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(
    @Body(ValidationPipe)
    createCustomerStaffIdentityDto: CreateCustomerStaffIdentityDto,
  ): Promise<CustomerStaffIdentity> {
    return this.customerStaffIdentitiesService.create(
      createCustomerStaffIdentityDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all customer staff identities' })
  @ApiResponse({
    status: 200,
    description: 'Return all customer staff identities.',
    type: [CustomerStaffIdentity],
  })
  async findAll(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('customerStaffId') customerStaffId?: string,
    @Query('platform') platform?: string,
    @Query('isActive') isActive?: string,
  ): Promise<CustomerStaffIdentity[]> {
    const where: Prisma.CustomerStaffIdentityWhereInput = {};

    if (customerStaffId) {
      where.customerStaffId = customerStaffId;
    }

    if (platform) {
      where.platform = { contains: platform, mode: 'insensitive' as const };
    }

    // Only filter by isActive when it's explicitly 'true' or 'false'
    if (isActive === 'true' || isActive === 'false') {
      where.isActive = isActive === 'true';
    }

    return this.customerStaffIdentitiesService.findMany({
      skip,
      take: take || 10,
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer staff identity by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the customer staff identity.',
    type: CustomerStaffIdentity,
  })
  @ApiResponse({
    status: 404,
    description: 'Customer staff identity not found.',
  })
  async findOne(
    @Param('id') id: string,
  ): Promise<CustomerStaffIdentity | null> {
    return this.customerStaffIdentitiesService.findOne({ id });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer staff identity' })
  @ApiResponse({
    status: 200,
    description: 'The customer staff identity has been successfully updated.',
    type: CustomerStaffIdentity,
  })
  @ApiResponse({
    status: 404,
    description: 'Customer staff identity not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Customer staff identity field already exists.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe)
    updateCustomerStaffIdentityDto: UpdateCustomerStaffIdentityDto,
  ): Promise<CustomerStaffIdentity> {
    return this.customerStaffIdentitiesService.update(
      { id },
      updateCustomerStaffIdentityDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a customer staff identity' })
  @ApiResponse({
    status: 204,
    description: 'The customer staff identity has been successfully deleted.',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer staff identity not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Cannot delete customer staff identity as it is being used by other entities.',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.customerStaffIdentitiesService.delete({ id });
  }
}
