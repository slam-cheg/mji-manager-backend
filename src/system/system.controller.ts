import { Controller, Get, Post, Body, Res } from '@nestjs/common';
import { timeStamp } from '../utils/timeStamp';
import { API_ROUTES } from 'src/config/api.config';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Controller('api')
export class SystemController {
  @Get(API_ROUTES.system.checkResponse)
  async checkResponse() {
    console.log("Проверка ответа сервера", timeStamp());
    return { status: "200", message: "OK" };
  }

  @Get(API_ROUTES.system.getScripts)
  async getScripts(@Res() res: Response) {
    try {
      // Ищем файл appBuild.js в возможных местах
      const possiblePaths = [
        path.join(process.cwd(), 'public', 'appBuild.js'),
        path.join(process.cwd(), 'server', 'appdata', 'appBuild.js'),
        path.join(__dirname, '../../public/appBuild.js'),
        path.join(__dirname, '../../server/appdata/appBuild.js'),
      ];

      let filePath: string | null = null;
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          filePath = possiblePath;
          break;
        }
      }

      if (!filePath) {
        return res.status(404).json({ error: 'appBuild.js not found' });
      }

      return res.sendFile(filePath);
    } catch (error) {
      console.error('Error serving appBuild.js:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
