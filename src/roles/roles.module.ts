import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { RolesGuard } from './roles.guard';

@Module({
  controllers: [RolesController],
  providers: [RolesService, RolesGuard]
})
export class RolesModule {}
