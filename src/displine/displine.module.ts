import { Module } from '@nestjs/common';
import { DisplineController } from './displine.controller';
import { DisplineService } from './displine.service';

@Module({
  controllers: [DisplineController],
  providers: [DisplineService]
})
export class DisplineModule {}
