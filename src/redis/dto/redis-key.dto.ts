import { IsInt, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class RedisKeyDto {
  @Matches(/^[a-zA-Z0-9:_-]{1,100}$/)
  key: string;
}

export class RedisValueDto {
  @IsString()
  @MaxLength(10000)
  value: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(86400)
  ttlSeconds: number = 3600;
}

export class CreateRedisKeyDto extends RedisValueDto {
  @Matches(/^[a-zA-Z0-9:_-]{1,100}$/)
  key: string;
}

export class ListRedisKeysDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/^\d{1,20}$/)
  cursor: string = '0';
}
