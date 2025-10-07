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
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { Channel } from './entities/channel.entity';
import { Prisma } from '../generated/prisma/client';

@ApiTags('channels')
@ApiBearerAuth()
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new channel' })
  @ApiResponse({
    status: 201,
    description: 'The channel has been successfully created.',
    type: Channel,
  })
  @ApiResponse({ status: 409, description: 'Channel field already exists.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(
    @Body(ValidationPipe) createChannelDto: CreateChannelDto,
  ): Promise<Channel> {
    return this.channelsService.create(createChannelDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all channels' })
  @ApiResponse({
    status: 200,
    description: 'Return all channels.',
    type: [Channel],
  })
  async findAll(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('search') search?: string,
    @Query('platform') platform?: string,
    @Query('chatAgentId') chatAgentId?: string,
    @Query('isActive') isActive?: string,
  ): Promise<Channel[]> {
    const where: Prisma.ChannelWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (platform) {
      where.platform = { contains: platform, mode: 'insensitive' as const };
    }

    if (chatAgentId) {
      where.chatAgentId = chatAgentId;
    }

    // Only filter by isActive when it's explicitly 'true' or 'false'
    if (isActive === 'true' || isActive === 'false') {
      where.isActive = isActive === 'true';
    }

    return this.channelsService.findMany({
      skip,
      take: take || 10,
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a channel by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the channel.',
    type: Channel,
  })
  @ApiResponse({ status: 404, description: 'Channel not found.' })
  async findOne(@Param('id') id: string): Promise<Channel | null> {
    return this.channelsService.findOne({ id });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a channel' })
  @ApiResponse({
    status: 200,
    description: 'The channel has been successfully updated.',
    type: Channel,
  })
  @ApiResponse({ status: 404, description: 'Channel not found.' })
  @ApiResponse({ status: 409, description: 'Channel field already exists.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateChannelDto: UpdateChannelDto,
  ): Promise<Channel> {
    return this.channelsService.update({ id }, updateChannelDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a channel' })
  @ApiResponse({
    status: 204,
    description: 'The channel has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Channel not found.' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete channel as it is being used by other entities.',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.channelsService.delete({ id });
  }
}
