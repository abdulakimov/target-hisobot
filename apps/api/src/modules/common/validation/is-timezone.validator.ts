import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/** True if `tz` is a valid IANA timezone the runtime's Intl can resolve. */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length === 0) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

@ValidatorConstraint({ name: 'isTimeZone', async: false })
export class IsTimeZoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isValidTimeZone(value);
  }
  defaultMessage(): string {
    return "timezone yaroqli IANA timezone bo'lishi kerak (masalan Asia/Tashkent)";
  }
}

export function IsTimeZone(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isTimeZone',
      target: object.constructor,
      propertyName,
      options,
      validator: IsTimeZoneConstraint,
    });
  };
}
