import { IsString, IsNotEmpty } from "class-validator";

export class ActivateUserDTO {
  @IsString()
  @IsNotEmpty()
  login: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  key: string;
}
