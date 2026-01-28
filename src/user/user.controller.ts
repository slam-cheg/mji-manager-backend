import { API_ROUTES } from "src/config/api.config";
import { Controller, Post, Body, Patch } from "@nestjs/common";
import { UserService } from "./user.service";
import { ChangePermissionsDTO } from "./dto/change-permissions.dto";
import { timeStamp } from "src/utils/timeStamp";
import { writeLog } from "src/utils/writeLog";
import { AllUsersDTO } from "./dto/all-users.dto";
import { ConfigService } from "src/config/config.service";
import { ChangeProfileDTO } from "./dto/change-profile.dto";
import { DeactivateAccountDTO } from "./dto/deactivate-account.dto";
import { UserDataDTO } from "./dto/user-data.dto";
import { UpdateFioDTO } from "./dto/update-fio.dto";

@Controller("api")
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  @Patch(API_ROUTES.users.changePermissions)
  async changeUserPermissions(@Body() body: ChangePermissionsDTO) {
    console.log(`Начат процесс изменения доступов ${body.login} . . .`);

    const updateSuccess = await this.userService.updateUserPermissions(
      body.login,
      body.isAdmin,
    );

    const response = {
      status: updateSuccess
        ? `Доступы аккаунта ${body.login} успешно изменены.`
        : `Доступы аккаунта ${body.login} не изменены. Ошибка.`,
      boolean: updateSuccess,
      login: body.login,
      timeStamp: timeStamp(),
    };

    writeLog(response, "changePermissions");
    return response;
  }

  @Post(API_ROUTES.users.getAllUsers)
  async getAllUsers(@Body() body: AllUsersDTO) {
    console.log(`Запрос всех пользователей от ${body.login}...`);

    const users = await this.userService.getAllUsers();
    const functionsList = this.configService.getFunctionsList();

    const response = {
      staffList: users,
      functionsList,
    };

    const logInfo = {
      status: users.length
        ? "Данные о правах пользователя успешно получены."
        : "Ошибка получения данных о правах пользователя.",
      login: body.login,
      boolean: users.length > 0,
      timeStamp: timeStamp(),
    };

    writeLog(logInfo, "getAdminInfo");
    return response;
  }

  @Patch(API_ROUTES.users.changeAccount)
  async changeProfile(@Body() body: ChangeProfileDTO) {
    console.log(`Начат процесс изменения данных аккаунта ${body.login} . . .`);

    try {
      const updateSuccess = await this.userService.updateUserField(
        body.login,
        body.field,
        body.value,
      );

      const response = {
        status: updateSuccess
          ? `Данные аккаунта успешно изменены.`
          : `Данные не изменены. Ошибка.`,
        boolean: updateSuccess,
        value: body.value,
        field: body.field,
        login: body.login,
        timeStamp: timeStamp(),
      };

      writeLog(response, "ChangeProfile");
      return response;
    } catch (error) {
      return {
        status: error.message,
        boolean: false,
        value: body.value,
        field: body.field,
        login: body.login,
        timeStamp: timeStamp(),
      };
    }
  }

  @Patch(API_ROUTES.users.deactivateAccount)
  async deactivateAccount(@Body() body: DeactivateAccountDTO) {
    console.log(`Начат процесс деактивации аккаунта ${body.login} . . .`);

    const updateSuccess = await this.userService.deactivateAccount(body.login);

    const response = {
      status: updateSuccess
        ? `Деактивация прошла успешно. Аккаунт ${body.login} не активен.`
        : `Деактивация не удалась. Ошибка.`,
      boolean: updateSuccess,
      login: body.login,
      timeStamp: timeStamp(),
    };

    writeLog(response, "DeactivateAccount");
    return response;
  }

  @Post(API_ROUTES.users.getUserData)
  async getUserData(@Body() body: UserDataDTO) {
    return this.userService.getUserData(body);
  }

  @Post(API_ROUTES.users.updateFio)
  async updateFio(@Body() body: UpdateFioDTO) {
    console.log(
      `Начат процесс изменения ФИО у аккаунта ${body.data.login} . . .`,
    );

    try {
      const updateSuccess = await this.userService.updateUserField(
        body.data.login,
        "fio",
        body.data.fio,
      );

      const response = {
        status: updateSuccess
          ? `ФИО аккаунта ${body.data.login} успешно изменено.`
          : `ФИО аккаунта ${body.data.login} не изменено. Ошибка.`,
        boolean: updateSuccess,
        fio: body.data.fio,
        timeStamp: timeStamp(),
      };

      writeLog(response, "changeFio");
      return response;
    } catch (error) {
      const response = {
        status:
          error.message ||
          `ФИО аккаунта ${body.data.login} не изменено. Ошибка.`,
        boolean: false,
        fio: body.data.fio,
        timeStamp: timeStamp(),
      };

      writeLog(response, "changeFio");
      return response;
    }
  }
}
