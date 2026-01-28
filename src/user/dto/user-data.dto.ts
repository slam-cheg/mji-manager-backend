import { IsString, IsNotEmpty } from "class-validator";

export class UserDataDTO {
  @IsString()
  @IsNotEmpty()
  login: string;
}
