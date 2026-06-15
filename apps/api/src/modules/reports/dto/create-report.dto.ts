import {
  ArrayNotEmpty,
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
  @IsIn([...METRIC_KEYS], { each: true })
  metrics!: MetricKey[];

  @IsOptional()
  @IsString()
  leadActionType?: string | null;

  @IsIn([...WINDOW_PRESETS])
  windowPreset!: WindowPreset;

  @IsString()
  timezone!: string;

  @IsArray()
  @ArrayNotEmpty()
  @Matches(HHMM, { each: true })
  sendTimes!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  weekdays!: number[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
