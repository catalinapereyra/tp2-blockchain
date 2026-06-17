import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { DocumentsModule } from "./documents/documents.module";
import { UploadModule } from "./upload/upload.module";
import { AuthModule } from "./auth/auth.module";
import { PermissionsModule } from "./permissions/permissions.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    DocumentsModule,
    UploadModule,
    PermissionsModule,
  ],
})
export class AppModule {}
