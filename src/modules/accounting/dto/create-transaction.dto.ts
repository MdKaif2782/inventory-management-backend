import {
  IsNotEmpty,
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

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum ModeOfPayment {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
}

export const EXPENSE_CATEGORIES = [
  { value: 'site_expense', label: 'Site Expense' },
  { value: 'food_refreshment', label: 'Food & Refreshment Expense' },
  { value: 'office_admin', label: 'Office & Admin Expense' },
  { value: 'local_transport', label: 'Local Transport Expense' },
  { value: 'communication', label: 'Communication Expense' },
  { value: 'printing_stationery', label: 'Printing & Stationery Expense' },
  { value: 'repair_maintenance', label: 'Repair & Maintenance Expense' },
  { value: 'utility', label: 'Utility Expense' },
  { value: 'courier_delivery', label: 'Courier & Delivery Expense' },
  { value: 'staff_welfare', label: 'Staff Welfare Expense' },
  { value: 'small_purchase', label: 'Small Purchase Expense' },
  { value: 'emergency', label: 'Emergency Expense' },
  { value: 'miscellaneous', label: 'Miscellaneous Expense' },
  { value: 'other', label: 'Other (Custom)' },
] as const;

export const VALID_EXPENSE_CATEGORY_VALUES = EXPENSE_CATEGORIES.map(c => c.value);

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ValidateIf((o) => o.type === TransactionType.EXPENSE)
  @IsNotEmpty({ message: 'Category is required for expenses' })
  @IsString()
  category?: string;

  @ValidateIf((o) => o.category === 'other')
  @IsNotEmpty({ message: 'Custom category is required when category is "other"' })
  @IsString()
  @MaxLength(255)
  customCategory?: string;

  @ValidateIf((o) => o.type === TransactionType.INCOME)
  @IsOptional()
  @IsEnum(ModeOfPayment)
  modeOfPayment?: ModeOfPayment;

  @ValidateIf((o) => o.type === TransactionType.EXPENSE)
  @IsOptional()
  @IsBoolean()
  hasDetailAttached?: boolean;

  @IsNotEmpty()
  @IsDateString()
  date: string;
}
