import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { MatriculasController } from './matriculas.controller';
import { MatriculasService } from './matriculas.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MatriculasController],
  providers: [MatriculasService],
  exports: [MatriculasService],
})
export class MatriculasModule {}
