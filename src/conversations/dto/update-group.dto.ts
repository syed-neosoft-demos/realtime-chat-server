import { IsNotEmpty, IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  avatarUrl?: string;
}
