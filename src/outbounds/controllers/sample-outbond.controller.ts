import { Controller, Post } from '@nestjs/common';
import { SampleOutbondService } from '../services/sample-outbond.service';

@Controller('outbonds/sample')
export class SampleOutbondController {
  constructor(private readonly sampleOutbondService: SampleOutbondService) {}

  @Post('v2025.09.05')
  async sampleCreate() {
    return await this.sampleOutbondService.submit();
  }
}
