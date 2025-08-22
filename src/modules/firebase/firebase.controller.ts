import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { AccessTokenGuard } from '../../middlewares/access-token.guard';

@Controller('firebase')
export class FirebaseController {
  constructor(private readonly firebaseService: FirebaseService) {}

  @Get()
  async sayMyName() {
    return await this.firebaseService.sayMyName();
  }
  @Get('test-notification')
  async sendTestNotification() {
    return await this.firebaseService.sendTestNotification();
  }
  @Post('to-token')
  async sendNotificationToToken(
    @Body() body: { token: string; data: any; notification?: any },
  ) {
    return await this.firebaseService.sendNotificationToToken(
      body.token,
      body.data,
      body.notification,
    );
  }

  @Get('auth/test')
  @UseGuards(AccessTokenGuard)
  async testAuth() {
    return { message: 'Authentication passed' };
  }
}
