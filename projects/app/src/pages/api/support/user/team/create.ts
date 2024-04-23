import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import type { CreateTeamParams } from '@fastgpt/global/support/user/api.d';
import { MongoTeam } from '@fastgpt/service/support/user/team/teamSchema';
import { authUserNotVisitor } from '@fastgpt/service/support/permission/auth/user';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { name, avatar, balance = 99999999 } = req.body as CreateTeamParams;

    if (!name) {
      throw new Error('缺少参数');
    }

    // 凭证校验
    const { userId } = await authUserNotVisitor({ req, authToken: true });

    // 创建模型
    const response = await MongoTeam.create({
      name,
      ownerId: userId,
      avatar,
      balance
    });

    jsonRes(res, {
      data: response._id
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
