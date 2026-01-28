import { IsString, IsNotEmpty, IsObject } from "class-validator";

export class UpdateDefectsDTO {
  @IsString()
  @IsNotEmpty()
  login: string;

  @IsObject()
  @IsNotEmpty()
  defects: Record<string, any>;
}
