import { Global, Module } from '@nestjs/common';

import { ProjectAccessService } from './services/project-access.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  providers: [ProjectAccessService, JwtAuthGuard, RolesGuard],
  exports: [ProjectAccessService, JwtAuthGuard, RolesGuard],
})
export class CommonModule {}
