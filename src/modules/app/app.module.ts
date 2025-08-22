import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { Auth } from 'firebase-admin/lib/auth/auth';
import { AuthModule } from '../auth/auth.module';
import { ProductModule } from '../product/product.module';
import { PosModule } from '../pos/pos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    AuthModule,
    ProductModule,
    PosModule
    //FirebaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
