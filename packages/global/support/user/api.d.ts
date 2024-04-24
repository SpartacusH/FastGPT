import { OAuthEnum } from './constant';
import { AppTypeEnum } from '../../core/app/constants';
import { AppSchema } from '../../core/app/type';

export type PostLoginProps = {
  username: string;
  password: string;
};

export type OauthLoginProps = {
  type: `${OAuthEnum}`;
  code: string;
  callbackUrl: string;
  inviterId?: string;
  tmbId?: string;
};

export type FastLoginProps = {
  token: string;
  code: string;
};

/*创建团队*/
export type CreateTeamParams = {
  name?: string;
  avatar?: string;
  balance?: bigint;
};
/*修改团队*/
export interface TeamUpdateParams {
  teamId: string;
  name?: string;
  avatar?: string;
  balance?: bigint;
}
