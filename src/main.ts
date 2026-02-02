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

  const port = process.env.PORT ? parseInt(String(process.env.PORT), 10) : 3000;
  const host = process.env.HOST || "0.0.0.0";
  await app.listen(port, host);
  console.log(`🚀 Server running on http://${host}:${port}`);
}

bootstrap().catch((err) => {
  console.error("Error during bootstrap:", err);
});
