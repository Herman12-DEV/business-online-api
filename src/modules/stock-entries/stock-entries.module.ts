import { Module } from '@nestjs/common';
import { StockEntriesController } from './stock-entries.controller';
import { StockEntriesService } from './stock-entries.service';

@Module({
  controllers: [StockEntriesController],
  providers: [StockEntriesService],
})
export class StockEntriesModule {}