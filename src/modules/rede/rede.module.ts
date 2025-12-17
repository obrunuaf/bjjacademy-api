import { Module } from '@nestjs/common';
import { RedeController } from './rede.controller';
import { RedeService } from './rede.service';

@Module({
  controllers: [RedeController],
  providers: [RedeService],
  exports: [RedeService],
})
export class RedeModule {}
