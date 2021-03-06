import { WsException } from '@nestjs/websockets';
import { ErrorCodeMap } from '../contents/error-code.contants';

export class SocketException extends WsException {
  private errorCode: number;

  constructor(errorCode: number) {
    super(ErrorCodeMap[errorCode]);
  }

  getErrorCode(): number {
    return this.errorCode;
  }
}
