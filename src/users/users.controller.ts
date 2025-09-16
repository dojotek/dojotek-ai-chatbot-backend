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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'The user has been successfully created.',
    type: User,
  })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(
    @Body(ValidationPipe) createUserDto: CreateUserDto,
  ): Promise<User> {
    try {
      return await this.usersService.create(createUserDto);
    } catch (error) {
      // Re-throw HTTP exceptions as they are already properly formatted
      if (error instanceof HttpException) {
        throw error;
      }

      // Handle unexpected errors
      throw new HttpException(
        'An unexpected error occurred while creating user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'Return all users.',
    type: [User],
  })
  async findAll(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('search') search?: string,
  ): Promise<User[]> {
    try {
      const where = search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' as const } },
              { name: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : undefined;

      return await this.usersService.findMany({
        skip,
        take: take || 10,
        where,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while fetching users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the user.',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findOne(@Param('id') id: string): Promise<User | null> {
    try {
      const user = await this.usersService.findOne({ id });
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      return user;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while fetching user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('email/:email')
  @ApiOperation({ summary: 'Get a user by email' })
  @ApiResponse({
    status: 200,
    description: 'Return the user.',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findByEmail(@Param('email') email: string): Promise<User | null> {
    try {
      const user = await this.usersService.findOne({ email });
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      return user;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while fetching user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully updated.',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ): Promise<User> {
    try {
      return await this.usersService.update({ id }, updateUserDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while updating user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({
    status: 204,
    description: 'The user has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async remove(@Param('id') id: string): Promise<void> {
    try {
      await this.usersService.delete({ id });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An unexpected error occurred while deleting user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
