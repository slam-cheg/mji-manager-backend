import { IsString, IsNotEmpty, MinLength } from "class-validator";

export class IRegisterUserDTO {
  @IsString()
  @IsNotEmpty()
  login: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8) // Минимальная длина пароля
  password: string;

  @IsString()
  fio?: string; // ФИО не обязательно
}
