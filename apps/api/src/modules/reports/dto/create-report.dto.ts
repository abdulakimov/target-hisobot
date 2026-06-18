import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { METRIC_KEYS, WINDOW_PRESETS, type MetricKey, type WindowPreset } from '@hisobotchi/shared';
import { IsTimeZone } from '../../common/validation/is-timezone.validator';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateReportDto {
  @IsOptional()
  @IsString()
  name?: string | null;

  @IsUUID()
  adAccountId!: string;

  @IsUUID()
  telegramGroupId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(METRIC_KEYS.length)
  @IsIn([...METRIC_KEYS], { each: true })
  metrics!: MetricKey[];

  @IsOptional()
  @IsString()
  leadActionType?: string | null;

  @IsIn([...WINDOW_PRESETS])
  windowPreset!: WindowPreset;

  @IsTimeZone()
  timezone!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(24)
  @Matches(HHMM, { each: true })
  sendTimes!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  weekdays!: number[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
