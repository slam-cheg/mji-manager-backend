import { IsString, IsNotEmpty } from "class-validator";

export class DeactivateAccountDTO {
  @IsString()
  @IsNotEmpty()
  login: string;
}
