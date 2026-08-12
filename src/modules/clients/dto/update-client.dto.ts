import { IsString, IsOptional, IsEmail } from 'class-validator';

// Tous les champs optionnels : on peut modifier juste un champ
export class UpdateClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}