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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';
import { Prisma } from '../generated/prisma/client';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({
    status: 201,
    description: 'The customer has been successfully created.',
    type: Customer,
  })
  @ApiResponse({ status: 409, description: 'Customer field already exists.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(
    @Body(ValidationPipe) createCustomerDto: CreateCustomerDto,
  ): Promise<Customer> {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all customers' })
  @ApiResponse({
    status: 200,
    description: 'Return all customers.',
    type: [Customer],
  })
  async findAll(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('search') search?: string,
    @Query('industry') industry?: string,
    @Query('isActive') isActive?: string,
  ): Promise<Customer[]> {
    const where: Prisma.CustomerWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (industry) {
      where.industry = { contains: industry, mode: 'insensitive' as const };
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    return this.customersService.findMany({
      skip,
      take: take || 10,
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the customer.',
    type: Customer,
  })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  async findOne(@Param('id') id: string): Promise<Customer | null> {
    return this.customersService.findOne({ id });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiResponse({
    status: 200,
    description: 'The customer has been successfully updated.',
    type: Customer,
  })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  @ApiResponse({ status: 409, description: 'Customer field already exists.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    return this.customersService.update({ id }, updateCustomerDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a customer' })
  @ApiResponse({
    status: 204,
    description: 'The customer has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  @ApiResponse({
    status: 409,
    description:
      'Cannot delete customer as it is being used by other entities.',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.customersService.delete({ id });
  }
}
