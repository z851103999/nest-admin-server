import { SetMetadata } from '@nestjs/common'; // 使用指定的'键'将元数据分配给类/函数的装饰器。
import { MISSION_KEY_METADATA } from '@/common/contants/decorator.contants';
/**
 * 定时任务标记，没有该任务标记的任务不会被执行，保证全局获取下的模块被安全执行
 */
export const Mission = () => SetMetadata(MISSION_KEY_METADATA, true);
