import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as bodyParser from "body-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: "*", // ✅ Разрешаем CORS для всех, включая 185.173.2.132 и расширения браузера
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Accept, Authorization",
  });
  app.useGlobalPipes(new ValidationPipe());
  app.use(bodyParser.json({ limit: "50mb" })); // Увеличиваем лимит до 50MB
  app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

  const port = process.env.PORT || 3000;
  await app.listen(port, "0.0.0.0"); // Слушаем на всех интерфейсах
  console.log(`🚀 Server running on http://0.0.0.0:${port}`);
}

bootstrap().catch((err) => {
	console.error("Error during bootstrap:", err);
});
