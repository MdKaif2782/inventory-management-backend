import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { Auth } from 'firebase-admin/lib/auth/auth';
import { AuthModule } from '../auth/auth.module';
import { ProductModule } from '../product/product.module';
import { PosModule } from '../pos/pos.module';
import { StaffManagementModule } from '../staff-management/staff-management.module';
import { ReportModule } from '../report/report.module';
import { OrderModule } from '../order/order.module';
import { EmployeeModule } from '../employee/employee.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    AuthModule,
    ProductModule,
    PosModule,
    StaffManagementModule,
    ReportModule,
    OrderModule,
    EmployeeModule
    //FirebaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
