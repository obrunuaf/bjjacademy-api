import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { AulasController } from './aulas.controller';
import { AulasService } from './aulas.service';

@Module({
  imports: [DatabaseModule, NotificacoesModule],
  controllers: [AulasController],
  providers: [AulasService],
  exports: [AulasService],
})
export class AulasModule {}

