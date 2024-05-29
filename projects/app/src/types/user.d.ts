import { BillSourceEnum } from '@fastgpt/global/support/wallet/bill/constants';
import type { UserModelSchema } from '@fastgpt/global/support/user/type';
import { BillSchema } from '@fastgpt/global/support/wallet/bill/type.d';

export interface UserUpdateParams {
  balance?: number;
  avatar?: string;
  timezone?: string;
  openaiAccount?: UserModelSchema['openaiAccount'];
}
export type CreateUserParams = {
  avatar: string;
  username: string;
  password: string;
  teamId: string;
  timezone: string;
};
