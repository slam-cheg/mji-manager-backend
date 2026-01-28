import { IsString, IsNotEmpty } from "class-validator";

export class AllUsersDTO {
  @IsString()
  @IsNotEmpty()
  login: string;
}
