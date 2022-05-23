import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ADMIN_PREFIX,
  ADMIN_USER,
  AUTHORIZE_KEY_METADATA,
  PERMISSION_OPTIONAL_KEY_METADATA,
} from '../../../admin.constants';
import { FastifyRequest } from 'fastify';
import { ApiException } from 'src/common/exceptions/api.exception';
import { isEmpty } from 'lodash';
import { JwtService } from '@nestjs/jwt';
import { LoginService } from '../../../login/login.service';

/**
 * admin check guard
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private JwtService: JwtService,
    private loginService: LoginService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检测是否是开放类型，例如获取验证码类型的接口不需要校验，可以加入@Authorize可自动通过
    const authorize = this.reflector.get<boolean>(
      AUTHORIZE_KEY_METADATA,
      context.getHandler(),
    );
    if (authorize) {
      return true;
    }
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const url = request.url;
    const path = url.split('?')[0];
    const token = request.headers['authorization'] as string;
    if (isEmpty(token)) {
      // 登录无效或无权限访问
      throw new ApiException(11001);
    }
    try {
      // 挂载对象到当前请求上
      request[ADMIN_USER] = this.JwtService.verify(token);
    } catch (e) {
      // 无法通过token校验
      throw new ApiException(11001);
    }
    if (isEmpty(request[ADMIN_USER])) {
      throw new ApiException(11001);
    }
    const pv = await this.loginService.getRedisPasswordVersionById(
      request[ADMIN_USER].uid,
    );
    if (pv !== `${request[ADMIN_USER].pv}`) {
      // 密码版本不一致，登录期间已更改过密码
      throw new ApiException(11002);
    }
    // redis令牌
    const redisToken = await this.loginService.getRedisTokenById(
      request[ADMIN_USER].uid,
    );
    if (token !== redisToken) {
      // 与redis保存不一致 登录身份已过期
      throw new ApiException(11002);
    }
    // 注册该注解，Api则放行检测
    const notNeedPerm = this.reflector.get<boolean>(
      PERMISSION_OPTIONAL_KEY_METADATA,
      context.getHandler(),
    );
    // Token校验身份通过，判断是否需要权限URL，不需要权限则pass
    if (notNeedPerm) {
      return true;
    }
    const perms: string = await this.loginService.getRedisPermsById(
      request[ADMIN_USER].uid,
    );
    // 安全判空
    if (isEmpty(perms)) {
      throw new ApiException(11001);
    }
    // sys:admin:user -> sys/admin/user
    const permArray: string[] = (JSON.parse(perms) as string[]).map((e) => {
      return e.replace(/:/g, '/');
    });
    // 遍历权限是否包含该url，不包含则无访问权限
    if (!permArray.includes(path.replace(`/${ADMIN_PREFIX}/`, ''))) {
      throw new ApiException(11003);
    }
    // pass
    return true;
  }
}