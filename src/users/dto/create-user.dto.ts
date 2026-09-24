import { IsString, IsUrl, Matches, MaxLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Matches(/\S/)
  @MaxLength(255)
  displayName: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  avatarUrl?: string;
}
