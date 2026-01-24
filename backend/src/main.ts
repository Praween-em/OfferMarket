import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    console.log('Starting application...');
    console.log('Environment Check:');
    console.log(`- PORT: ${process.env.PORT || 3000}`);
    console.log(`- DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Missing'}`);

    const app = await NestFactory.create(AppModule);

    // Validate that the global prefix does not block the health check at '/'
    app.setGlobalPrefix('api', {
      exclude: ['/'],
    });

    app.enableCors();

    // Basic request logger for debugging
    app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      next();
    });

    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    const port = process.env.PORT ?? 3000;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Server running on http://0.0.0.0:${port}/api`);
    console.log(`❤️ Health check available at http://0.0.0.0:${port}/`);

  } catch (error) {
    console.error('❌ FATAL ERROR DURING STARTUP:', error);
    process.exit(1);
  }
}
bootstrap();
