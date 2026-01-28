import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { IUserEntity } from './user.types';
import { ICreateUserDTO } from './dto/create-user.dto';
import { UserDataDTO } from './dto/user-data.dto';
import { timeStamp } from 'src/utils/timeStamp';
import { writeLog } from 'src/utils/writeLog';
import { API_ROUTES } from 'src/config/api.config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByLogin(login: string): Promise<IUserEntity | null> {
    return this.userRepository.findOne({ where: { login } });
  }

  async updateUserActivation(login: string, activated: boolean): Promise<void> {
    await this.userRepository.update({ login }, { activated });
  }

  async createUser(userData: ICreateUserDTO): Promise<User> {
    const newUser = this.userRepository.create(userData);
    return this.userRepository.save(newUser);
  }

  async deactivateUser(login: string): Promise<void> {
    await this.userRepository.update({ login }, { activated: false });
  }

  async updateUserRefreshToken(login: string, refreshToken: string): Promise<void> {
    await this.userRepository.update(
      { login },
      { refreshToken } as Partial<User>, // ✅ Приводим к Partial<User>
    );
  }

  async updateUserPermissions(
    login: string,
    isAdmin: boolean,
  ): Promise<boolean> {
    const result = await this.userRepository.update({ login }, { isAdmin });

    return result.affected !== undefined && result.affected > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find();
  }

  async updateUserField(login: string, field: string, value: string): Promise<boolean> {
    const allowedFields = ['fio', 'password']; // ✅ Разрешённые поля для изменения
    if (!allowedFields.includes(field)) {
      throw new Error(`Изменение поля '${field}' запрещено.`);
    }

    // Если обновляется пароль, нужно его захешировать
    let finalValue = value;
    if (field === 'password') {
      finalValue = await bcrypt.hash(value, 10);
    }

    const result = await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ [field]: finalValue })
      .where('login = :login', { login })
      .execute();

    return result.affected !== undefined && result.affected > 0;
  }

  async deactivateAccount(login: string): Promise<boolean> {
    const result = await this.userRepository.update({ login }, { activated: false });

    return result.affected !== undefined && result.affected > 0;
  }

  async getUserData(dto: UserDataDTO) {
    console.log(`Начат процесс получения данных об аккаунте ${dto.login}...`);
    const user = await this.userRepository.findOne({ where: { login: dto.login } });

    if (!user) {
      return {
        fio: '',
        login: '',
        isAdmin: '',
        activated: false,
        timeStamp: timeStamp(),
      };
    }

    const userInfo = {
      fio: user.fio,
      login: user.login,
      isAdmin: user.isAdmin,
      activated: user.activated,
      timeStamp: timeStamp(),
    };

    writeLog(userInfo, 'getAccountInfo');
    return userInfo;
  }
}
