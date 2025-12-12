import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AlunoPresencasController } from './presencas-aluno.controller';
import { PresencasController } from './presencas.controller';
import { PresencasService } from './presencas.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PresencasController, AlunoPresencasController],
  providers: [PresencasService],
})
export class PresencasModule {}
