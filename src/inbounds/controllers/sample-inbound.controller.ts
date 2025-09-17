import { Controller, Post, Get, Body } from '@nestjs/common';
import { SampleInboundService } from '../services/sample-inbound.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SubmitDto } from '../dto/submit.dto';

@ApiTags('sample-inbound')
@ApiBearerAuth()
@Controller('inbounds/sample')
export class SampleInboundController {
  constructor(private readonly sampleInboundService: SampleInboundService) {}

  @Post('v2025.09.05')
  async sampleSubmit() {
    return await this.sampleInboundService.sampleSubmit();
  }

  @Post('v2025.09.17')
  async submit(@Body() submitDto: SubmitDto) {
    return await this.sampleInboundService.submit(submitDto);
  }

  @Get('log/debug')
  simulateDebug() {
    return this.sampleInboundService.simulateDebug();
  }

  @Get('log/warn')
  simulateWarning() {
    return this.sampleInboundService.simulateWarning();
  }

  @Get('log/error')
  simulateError() {
    return this.sampleInboundService.simulateError();
  }
}
