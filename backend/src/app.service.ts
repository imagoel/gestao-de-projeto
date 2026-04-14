import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getRoot() {
    return {
      service: 'gestao-gti-api',
      status: 'ok',
      message: 'API do MVP pronta para autenticação, projetos, board e cards.',
    };
  }

  getHealth() {
    return {
      service: 'gestao-gti-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
