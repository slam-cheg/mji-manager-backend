import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Делаем ConfigModule глобальным
      envFilePath: '.env', // Явно указываем путь к .env файлу
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Используем переменные из .env: HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME
        const host = configService.get<string>('HOST') || configService.get<string>('DB_HOST') || 'localhost';
        // DB_PORT должен быть числом, парсим строку из .env
        const portStr = configService.get<string>('DB_PORT');
        const port = portStr ? parseInt(portStr, 10) : 5432;
        const username = configService.get<string>('DB_USER') || 'postgres';
        const password = configService.get<string>('DB_PASS') || '';
        const database = configService.get<string>('DB_NAME') || 'Manager';

        console.log(`🔌 Подключение к БД: ${host}:${port}/${database} (user: ${username})`);

        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          autoLoadEntities: true,
          synchronize: true, // Для разработки, в проде выключи
        };
      },
    }),
  ],
})
export class DatabaseModule {}
