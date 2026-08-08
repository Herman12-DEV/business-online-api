import { IsString, IsOptional, IsArray, IsNumber, Min, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

class StockExitItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateStockExitDto {
  @IsEnum(['SALE', 'LOSS', 'OTHER'])
  type: 'SALE' | 'LOSS' | 'OTHER';

  @IsOptional()
  @IsString()
  reason?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockExitItemDto)
  items: StockExitItemDto[];
}