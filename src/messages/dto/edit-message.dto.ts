import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class EditMessageDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(10000)
  content: string;
}
