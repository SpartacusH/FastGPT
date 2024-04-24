import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import type { TeamUpdateParams } from '@fastgpt/global/support/user/api.d';
import { MongoTeam } from '@fastgpt/service/support/user/team/teamSchema';
import { authUserNotVisitor } from '@fastgpt/service/support/permission/auth/user';

/* 获取我的模型 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { name, avatar, teamId } = req.body as TeamUpdateParams;
    // const { teamId } = req.query as { teamId: string };

    if (!teamId) {
      throw new Error('teamId is empty');
    }

    // 凭证校验
    //    await authApp({ req, authToken: true, appId, per: permission ? 'owner' : 'w' });

    // 更新模型
    await MongoTeam.updateOne(
      {
        _id: teamId
      },
      {
        name,
        avatar
      }
    );

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
