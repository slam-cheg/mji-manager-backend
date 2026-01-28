import { Controller, Post, Body, Patch } from "@nestjs/common";
import { AppDataService } from "./appData.service";
import { writeLog } from "../utils/writeLog";
import { UpdateDefectsDTO } from "./dto/update-defects.dto";
import { API_ROUTES } from "src/config/api.config";

@Controller("api")
export class AppDataController {
  constructor(private readonly appDataService: AppDataService) {}

  @Post(API_ROUTES.app.getAppData)
  async getAppData(@Body() body: any) {
    if (!body) {
      return { status: 400, message: "Bad Request" };
    }

    const response = await this.appDataService.getAppData();
    writeLog(response, "getAppData");
    return response;
  }

  @Post(API_ROUTES.app.getApp)
  async getAppLayout(@Body() body: any) {
    if (!body) {
      return { status: 400, message: "Bad Request" };
    }

    const response = this.appDataService.getAppLayout();
    writeLog(response, "getApp");
    return response;
  }

  @Patch(API_ROUTES.app.updateDefects)
  async updateDefects(@Body() body: UpdateDefectsDTO) {
    return this.appDataService.updateDefects(body);
  }
}
