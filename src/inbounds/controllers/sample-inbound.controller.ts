import { Controller, Post } from '@nestjs/common';
import { SampleInboundService } from '../services/sample-inbound.service';

@Controller('inbounds/sample')
export class SampleInboundController {
  constructor(private readonly sampleInboundService: SampleInboundService) {}

  @Post('v2025.09.05')
  async sampleCreate() {
    return await this.sampleInboundService.submit();
  }
}
