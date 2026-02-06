import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsDateString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ModeOfPayment } from './create-transaction.dto';

export class UpdateTransactionDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @ValidateIf((o) => o.category === 'other')
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customCategory?: string;

  @IsOptional()
  @IsEnum(ModeOfPayment)
  modeOfPayment?: ModeOfPayment;

  @IsOptional()
  @IsBoolean()
  hasDetailAttached?: boolean;

  @IsOptional()
  @IsDateString()
  date?: string;
}
