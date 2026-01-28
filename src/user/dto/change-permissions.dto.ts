import { IsString, IsBoolean, IsNotEmpty } from "class-validator";

export class ChangePermissionsDTO {
  @IsString()
  @IsNotEmpty()
  login: string;

  @IsBoolean()
  isAdmin: boolean;
}
