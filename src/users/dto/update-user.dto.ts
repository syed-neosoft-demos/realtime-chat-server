import { IsString, IsUrl, Matches, MaxLength, ValidateIf } from 'class-validator';

export class UpdateUserDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  @MaxLength(255)
  displayName?: string;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  avatarUrl?: string | null;
}
