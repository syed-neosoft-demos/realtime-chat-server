import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): unknown {
    return {
      uptime: process.uptime(),
      message: 'Server is up & running',
    };
  }
}
