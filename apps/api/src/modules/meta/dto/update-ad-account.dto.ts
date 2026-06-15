import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateAdAccountDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  defaultLeadActionType?: string | null;
}
