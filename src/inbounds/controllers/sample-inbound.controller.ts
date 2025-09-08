import { Controller, Post, Get } from '@nestjs/common';
import { SampleInboundService } from '../services/sample-inbound.service';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('inbounds/sample')
@ApiBearerAuth()
export class SampleInboundController {
  constructor(private readonly sampleInboundService: SampleInboundService) {}

  @Post('v2025.09.05')
  async sampleCreate() {
    return await this.sampleInboundService.submit();
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
