import { DELETE, GET, POST, PUT } from '@/web/common/api/request';
import { hashStr } from '@fastgpt/global/common/string/tools';
import type { ResLogin } from '@/global/support/api/userRes.d';
import { UserAuthTypeEnum } from '@fastgpt/global/support/user/constant';
import { UserUpdateParams, CreateUserParams } from '@/types/user';
import { UserType } from '@fastgpt/global/support/user/type.d';
import type {
  FastLoginProps,
  OauthLoginProps,
  PostLoginProps
} from '@fastgpt/global/support/user/api.d';
import { PagingData, RequestPaging } from '@/types';
import { BillItemType } from '@fastgpt/global/support/wallet/bill/type';

/**
 * 根据 ID 删除模型
 */
export const delUserById = (id: string) => DELETE(`/support/user/account/delete?userId=${id}`);

export const postCreateUser = (data: CreateUserParams) =>
  POST<string>(`/support/user/account/create`, {
    username: data.username,
    password: hashStr(data.password),
    timezone: data.timezone,
    avatar: data.avatar,
    teamId: data.teamId
  });

export const getUserList = (data: RequestPaging) =>
  POST<PagingData<UserType>>(`/support/user/account/list`, data);

export const sendAuthCode = (data: {
  username: string;
  type: `${UserAuthTypeEnum}`;
  googleToken: string;
}) => POST(`/proApi/support/user/inform/sendAuthCode`, data);

export const getTokenLogin = () =>
  GET<UserType>('/support/user/account/tokenLogin', {}, { maxQuantity: 1 });
export const oauthLogin = (params: OauthLoginProps) =>
  POST<ResLogin>('/proApi/support/user/account/login/oauth', params);
export const postFastLogin = (params: FastLoginProps) =>
  POST<ResLogin>('/proApi/support/user/account/login/fastLogin', params);

export const postRegister = ({
  username,
  password,
  code,
  inviterId
}: {
  username: string;
  code: string;
  password: string;
  inviterId?: string;
}) =>
  POST<ResLogin>(`/proApi/support/user/account/register/emailAndPhone`, {
    username,
    code,
    inviterId,
    password: hashStr(password)
  });

export const postFindPassword = ({
  username,
  code,
  password
}: {
  username: string;
  code: string;
  password: string;
}) =>
  POST<ResLogin>(`/proApi/support/user/account/password/updateByCode`, {
    username,
    code,
    password: hashStr(password)
  });

export const updatePasswordByOld = ({
  oldPsw,
  newPsw,
  userId
}: {
  oldPsw: string;
  newPsw: string;
  userId: string;
}) =>
  POST('/support/user/account/updatePasswordByOld', {
    oldPsw: hashStr(oldPsw),
    newPsw: hashStr(newPsw),
    userId: userId
  });

export const postLogin = ({ password, ...props }: PostLoginProps) =>
  POST<ResLogin>('/support/user/account/loginByPassword', {
    ...props,
    password: hashStr(password)
  });

export const loginOut = () => GET('/support/user/account/loginout');

export const putUserInfo = (data: UserUpdateParams) => PUT('/support/user/account/update', data);
