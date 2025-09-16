import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  HttpStatus,
  Query,
  ParseIntPipe,
  ValidationPipe,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomerStaffsService } from './customer-staffs.service';
import { CreateCustomerStaffDto } from './dto/create-customer-staff.dto';
import { UpdateCustomerStaffDto } from './dto/update-customer-staff.dto';
import { CustomerStaff } from './entities/customer-staff.entity';
import { Prisma } from '../generated/prisma/client';

@ApiTags('customer-staffs')
@ApiBearerAuth()
@Controller('customer-staffs')
export class CustomerStaffsController {
  constructor(private readonly customerStaffsService: CustomerStaffsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new customer staff' })
  @ApiResponse({
    status: 201,
    description: 'The customer staff has been successfully created.',
    type: CustomerStaff,
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists or Customer not found.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(
    @Body(ValidationPipe) createCustomerStaffDto: CreateCustomerStaffDto,
  ): Promise<CustomerStaff> {
    try {
      return await this.customerStaffsService.create(createCustomerStaffDto);
    } catch (error) {
      // Re-throw HTTP exceptions as they are already properly formatted
      if (error instanceof HttpException) {
        throw error;
      }

      // Handle unexpected errors
      throw new HttpException(
        'An unexpected error occurred while creating customer staff',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all customer staffs' })
  @ApiResponse({
    status: 200,
    description: 'Return all customer staffs.',
    type: [CustomerStaff],
  })
  async findAll(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('search') search?: string,
    @Query('customerId') customerId?: string,
  ): Promise<CustomerStaff[]> {
    try {
      let where: Prisma.CustomerStaffWhereInput = {};

      // Add customer filter if provided
      if (customerId) {
        where.customerId = customerId;
      }

      // Add search filter if provided
      if (search) {
        const searchConditions = [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { department: { contains: search, mode: 'insensitive' as const } },
          { position: { contains: search, mode: 'insensitive' as const } },
        ];

        if (Object.keys(where).length > 0) {
          where = {
            AND: [where, { OR: searchConditions }],
          };
        } else {
          where.OR = searchConditions;
        }
      }

      return await this.customerStaffsService.findMany({
        skip,
        take: take || 10,
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while fetching customer staffs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer staff by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the customer staff.',
    type: CustomerStaff,
  })
  @ApiResponse({ status: 404, description: 'Customer staff not found.' })
  async findOne(@Param('id') id: string): Promise<CustomerStaff | null> {
    try {
      const customerStaff = await this.customerStaffsService.findOne({ id });
      if (!customerStaff) {
        throw new HttpException(
          'Customer staff not found',
          HttpStatus.NOT_FOUND,
        );
      }
      return customerStaff;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while fetching customer staff',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Note: Email is not unique in CustomerStaff schema, so email-based lookup is not available

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer staff' })
  @ApiResponse({
    status: 200,
    description: 'The customer staff has been successfully updated.',
    type: CustomerStaff,
  })
  @ApiResponse({ status: 404, description: 'Customer staff not found.' })
  @ApiResponse({
    status: 409,
    description: 'Email already exists or Customer not found.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateCustomerStaffDto: UpdateCustomerStaffDto,
  ): Promise<CustomerStaff> {
    try {
      return await this.customerStaffsService.update(
        { id },
        updateCustomerStaffDto,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while updating customer staff',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a customer staff' })
  @ApiResponse({
    status: 204,
    description: 'The customer staff has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Customer staff not found.' })
  async remove(@Param('id') id: string): Promise<void> {
    try {
      await this.customerStaffsService.delete({ id });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while deleting customer staff',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
