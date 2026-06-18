import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** POST /api/admin/users/:id/grant — grant or extend N days of access. */
export class GrantAccessDto {
  @IsInt()
  @Min(1)
  @Max(3650)
  days!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @IsOptional()
  @IsIn(['extend', 'set'])
  mode?: 'extend' | 'set';
}
