import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SlackInboundService } from '../services/slack-inbound.service';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('slack-inbound')
@Controller('inbounds/slack')
export class SlackInboundController {
  private readonly logger = new Logger(SlackInboundController.name);
  constructor(private readonly slackInboundService: SlackInboundService) {}

  @Public()
  @Post('webhook/v2025.10.10')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Slack event webhook handler' })
  async handleEvent(
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log(
      `Received Slack webhook headers: ${JSON.stringify(headers)}`,
    );
    this.logger.log(`Received Slack webhook body: ${JSON.stringify(body)}`);

    return this.slackInboundService.handleEvent(
      body as Record<string, unknown>,
      headers,
    );
  }
}
