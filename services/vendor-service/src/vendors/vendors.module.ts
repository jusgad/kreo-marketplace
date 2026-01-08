import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { User } from '../../../auth-service/src/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    HttpModule.register({
      timeout: 5000, // 5 seconds timeout
      maxRedirects: 5,
    }),
  ],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
