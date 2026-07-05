import { Module } from '@nestjs/common';
import { NimbusService } from './nimbus.service';

@Module({
  providers: [NimbusService],
  exports: [NimbusService],
})
export class NimbusModule {}
