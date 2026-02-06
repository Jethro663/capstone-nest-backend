import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Global() // Makes this module available everywhere without importing
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService], // Other modules can inject DatabaseService
})
export class DatabaseModule {}
