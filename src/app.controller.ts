import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from '@/app.service.js';
import { Public } from '@/common/decorators/public.decorator.js';

@Controller()
export class AppController {
  constructor(@Inject(AppService) private readonly appService: AppService) {}

  @Get('health')
  @Public()
  getHello(): unknown {
    return this.appService.getHello();
  }
}
