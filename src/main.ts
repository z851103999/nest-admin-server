import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
// import { contentParser } from 'fastify-multer'
import { AppModule } from './app.module';
import { setupSwagger } from './setup-swagger';
import history from 'connect-history-api-fallback';
import helmet from 'helmet';
import compression from 'compression';
import { LoggerService } from './shared/logger/logger.service';
import { Logger } from '@nestjs/common';

// webpack
declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // await app.register(contentParser)

  /* 设置 HTTP 标头来帮助保护应用免受一些众所周知的 Web 漏洞的影响 */
  app.use(
    helmet({
      contentSecurityPolicy: false, //取消https强制转换
    }),
  );

  // winston
  app.useLogger(app.get(LoggerService));

  // gzip
  app.use(compression());

  // cors
  app.enableCors();

  /* 启动 vue 的 history模式 */
  app.use(
    history({
      rewrites: [
        {
          from: /^\/swagger-ui\/.*$/,
          to: function (context) {
            return context.parsedUrl.pathname;
          },
        },
      ],
    }),
  );

  /* 配置静态资源目录 */
  app.useStaticAssets({ root: 'public' });

  /* 启动swagger */
  setupSwagger(app);

  /* 监听启动端口 */
  await app.listen(3000);

  // webpack打包
  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }

  /* 打印swagger地址 */
  console.log('http://127.0.0.1:3000/swagger-ui/');
  // 根据操作系统和IP版本返回应用程序正在监听的url。
  const serverUrl = await app.getUrl();
  Logger.log(`api服务已经启动,请访问: ${serverUrl}`);
  Logger.log(`API文档已生成,请访问: ${serverUrl}/swagger-ui/`);
}
bootstrap();
