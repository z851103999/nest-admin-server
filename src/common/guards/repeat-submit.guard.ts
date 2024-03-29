import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REOEATSUBMIT_METADATA } from '../contants/decorator.contant';
import { RepeatSubmitOption } from '../decorators/repeat-submit.decorator';
import { FastifyRequest } from 'fastify';
import { ApiException } from '../exceptions/api.exception';

/**
 * 防止重复提交守卫
 */
@Injectable()
export class RepeatSubmitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRedis() private readonly redis: Redis,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const repeatSubmitOption: RepeatSubmitOption = this.reflector.get(
      REOEATSUBMIT_METADATA,
      context.getHandler(),
    );
    if (!repeatSubmitOption) return true;
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const cache = await this.redis.get(request.url);
    const data = {
      body: request.body,
      prams: request.params,
      query: request.query,
    };
    const dataString = JSON.stringify(data);
    if (!cache) {
      //没有缓存数据
      if (dataString) {
        await this.redis.set(
          request.url,
          dataString,
          'EX',
          repeatSubmitOption.interval,
        );
      }
    } else {
      if (dataString && cache === dataString) {
        throw new ApiException(10006, 200);
      }
    }
    return true;
  }
}
