import {
  IsString,
  IsNotEmpty,
  IsObject,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class UpdateFioDataDTO {
  @IsString()
  @IsNotEmpty()
  fio: string;

  @IsString()
  @IsNotEmpty()
  login: string;
}

export class UpdateFioDTO {
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateFioDataDTO)
  data: UpdateFioDataDTO;
}
