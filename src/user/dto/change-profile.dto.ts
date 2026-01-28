import { IsString, IsNotEmpty } from "class-validator";

export class ChangeProfileDTO {
  @IsString()
  @IsNotEmpty()
  login: string;

  @IsString()
  @IsNotEmpty()
  field: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}
