import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ClassTemplatesService } from './src/modules/class-templates/class-templates.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const service = app.get(ClassTemplatesService);
    const result = await service.getContent('eef17f6e-d153-4eab-a235-3d76f675888f');
    console.log('OK', {
      modules: result.modules.length,
      lessons: result.lessons?.length ?? 0,
      assessments: result.assessments.length,
      announcements: result.announcements.length,
      chunks: result.chunks?.length ?? 0,
    });
  } catch (error) {
    console.error('GET_CONTENT_ERROR', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

run();
