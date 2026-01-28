import { IsObject, IsNotEmpty } from "class-validator";

export class ActiveFunctionsDTO {
  @IsObject()
  @IsNotEmpty()
  functions: Record<string, any>;
}
