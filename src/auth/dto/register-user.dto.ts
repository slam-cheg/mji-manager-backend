import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsEmail,
  IsOptional,
} from "class-validator";

export class IRegisterUserDTO {
  @IsString()
  @IsNotEmpty()
  login: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8) // Минимальная длина пароля
  password: string;

  @IsString()
  @IsOptional()
  fio?: string; // ФИО не обязательно

  @IsEmail()
  @IsOptional()
  email?: string; // Почта для отправки регистрационного ключа
}
