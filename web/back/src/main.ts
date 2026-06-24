import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONT_URL || "http://localhost:5173",
  });

  // Los documentos (PDF/imagen) se mandan en base64 dentro del JSON al guardar
  // la metadata, así que subimos el límite del body parser (10MB en base64 ≈ 13.4MB).
  app.use(json({ limit: "15mb" }));
  app.use(urlencoded({ extended: true, limit: "15mb" }));

  app.setGlobalPrefix("api");

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`MediChain API corriendo en http://localhost:${port}`);
}

bootstrap();
