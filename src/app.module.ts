import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { SalesModule } from './modules/sales/sales.module';
import { ReportsModule } from './modules/reports/reports.module';
import { StockEntriesModule } from './modules/stock-entries/stock-entries.module';
import { StockExitsModule } from './modules/stock-exits/stock-exits.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ProductsModule,
    SalesModule,
    ReportsModule,
    StockEntriesModule,
    StockExitsModule,
  ],
})
export class AppModule {}