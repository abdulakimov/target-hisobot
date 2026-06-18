import { IsOptional, IsString, MaxLength } from 'class-validator';
import { IsTimeZone } from '../../common/validation/is-timezone.validator';

/** PATCH /api/me — fields the user may edit on their own profile. */
export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string | null;

  @IsOptional()
  @IsTimeZone()
  timezone?: string;
}
