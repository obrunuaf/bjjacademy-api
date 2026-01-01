import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { NotificacoesService } from './notificacoes.service';
import { NotificacoesController } from './notificacoes.controller';
import { PreferenciasNotificacaoService } from './preferencias-notificacao.service';

@Module({
  imports: [DatabaseModule],
  controllers: [NotificacoesController],
  providers: [NotificacoesService, PreferenciasNotificacaoService],
  exports: [NotificacoesService, PreferenciasNotificacaoService],
})
export class NotificacoesModule {}
