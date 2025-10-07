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
import { LarkInboundService } from '../services/lark-inbound.service';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('lark-inbound')
@Controller('inbounds/lark')
export class LarkInboundController {
  private readonly logger = new Logger(LarkInboundController.name);
  constructor(private readonly larkInboundService: LarkInboundService) {}

  @Public()
  @Post('webhook/v2025.10.07')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lark event webhook handler' })
  async handleEvent(
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log(
      `Received Lark webhook headers: ${JSON.stringify(headers)}`,
    );
    this.logger.log(`Received Lark webhook body: ${JSON.stringify(body)}`);

    return this.larkInboundService.handleEvent(
      body as Record<string, unknown>,
      headers,
    );
  }
}
