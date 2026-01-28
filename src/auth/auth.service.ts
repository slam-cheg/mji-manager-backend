import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { UserService } from "../user/user.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { writeLog } from "../utils/writeLog";
import { timeStamp } from "../utils/timeStamp";
import { IUserResponse } from "./auth.types";
import { IRegisterUserDTO } from "./dto/register-user.dto";
import { ICreateUserDTO } from "../user/dto/create-user.dto";
import { keygen } from "src/utils/keygen";

@Injectable()
export class AuthService {
	constructor(
		private readonly userService: UserService,
		private readonly jwtService: JwtService
	) {}

	// ✅ Генерация токенов
	private generateTokens(user: any) {
		const accessToken = this.jwtService.sign(
			{ login: user.login, fio: user.fio, isAdmin: user.isAdmin },
			{ expiresIn: "1h" } // 🔥 Access-токен действует 1 час
		);

		const refreshToken = this.jwtService.sign(
			{ login: user.login },
			{ expiresIn: "14d" } // 🔥 Refresh-токен действует 14 дней
		);

		return { accessToken, refreshToken };
	}

	// ✅ Авторизация
	async validateUser(requestBody: { data: { login: string; password: string } }): Promise<{ accessToken: string; refreshToken: string }> {
		const { login, password } = requestBody.data;
		console.log(`Начат процесс входа: ${login} . . .`);

		const user = await this.userService.findByLogin(login);
		if (!user) {
			console.log(`Ошибка: пользователь ${login} не найден.`);
			throw new UnauthorizedException({ status: "Ошибка: пользователь не найден" });
		}

		// ✅ Проверяем пароль
		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			console.log(user)
			console.log(`Ошибка: неверный логин или пароль.`);
			throw new UnauthorizedException({ status: "Ошибка: неверный логин или пароль" });
		}

		if (!user.activated) {
			console.log(`Ошибка: аккаунт не активирован.`);
			console.log(user)
			throw new ForbiddenException({ status: "Ошибка: аккаунт не активирован" });
		}

		// ✅ Генерируем access и refresh токены
		const { accessToken, refreshToken } = this.generateTokens(user);

		// ✅ Сохраняем refresh-токен в базе
		await this.userService.updateUserRefreshToken(login, refreshToken);

		writeLog({ status: `Вход в аккаунт ${login} успешен`, timeStamp: timeStamp() }, "logIn");
		console.log(`Вход в аккаунт ${login} успешен.`);
		return { accessToken, refreshToken };
	}

	// ✅ Проверка refresh-токена и обновление access-токена
	async refreshAccessToken(refreshToken: string) {
		try {
			const decoded = this.jwtService.verify(refreshToken); // ✅ Декодируем refreshToken
			const user = await this.userService.findByLogin(decoded.login);

			if (!user || user.refreshToken !== refreshToken) {
				throw new UnauthorizedException("❌ Refresh token недействителен");
			}

			// 🔥 Генерируем новый accessToken
			const newAccessToken = this.jwtService.sign({ login: user.login, fio: user.fio, isAdmin: user.isAdmin }, { expiresIn: "1h" });

			return { accessToken: newAccessToken };
		} catch (error) {
			throw new UnauthorizedException("❌ Ошибка при обновлении токена");
		}
	}

	async activateUser(login: string, password: string, key: string) {
		console.log(`Начат процесс активации аккаунта ${login} . . .`);

		const user = await this.userService.findByLogin(login);
		if (!user) {
			throw new UnauthorizedException({ status: "Ошибка: пользователь не найден" });
		}

		if (!(await bcrypt.compare(password, user.password))) {
			throw new UnauthorizedException({ status: "Ошибка: неверный логин или пароль" });
		}

		let activationStatus = {
			status: `Аккаунт ${login} не активирован. Неверный ключ`,
			boolean: false,
			activated: false,
			timeStamp: timeStamp(),
		};

		if (user.activated) {
			activationStatus = {
				status: `Аккаунт ${login} уже активирован`,
				boolean: true,
				activated: true,
				timeStamp: timeStamp(),
			};
		} else if (user.key === key) {
			await this.userService.updateUserActivation(login, true);
			activationStatus = {
				status: `Аккаунт ${login} успешно активирован`,
				boolean: true,
				activated: true,
				timeStamp: timeStamp(),
			};
		} else {
			activationStatus.status = `Аккаунт ${login} не активирован. Такой ключ не зарегистрирован`;
		}

		writeLog(activationStatus, "Activation");
		return activationStatus;
	}

	async registerUser(registerDTO: IRegisterUserDTO) {
		const { login, password, fio } = registerDTO;
		console.log(`Начат процесс регистрации аккаунта ${login}`);

		const existingUser = await this.userService.findByLogin(login);
		if (existingUser) {
			throw new BadRequestException({
				status: `Регистрация аккаунта ${login} завершилась неудачно. Такой логин уже зарегистрирован`,
				registration: false,
				key: "Not generated",
				timeStamp: timeStamp(),
			});
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		const activationKey = keygen();

		const newUser: ICreateUserDTO = {
			login,
			password: hashedPassword,
			fio,
			key: activationKey,
			activated: false,
		};

		await this.userService.createUser(newUser);

		const response = {
			status: `Регистрация аккаунта ${login} завершилась успешно`,
			registration: true,
			key: activationKey,
			timeStamp: timeStamp(),
		};

		writeLog(response, "Registration");

		return response;
	}
}
