import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { CreateUserParams } from '@/types/user';
import { authUserNotVisitor } from '@fastgpt/service/support/permission/auth/user';
import { SimpleModeTemplate_FastGPT_Universal } from '@/global/core/app/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { username, avatar, password, teamId, timezone } = req.body as CreateUserParams;

    // 创建用户
    const response = await MongoUser.create({
      avatar,
      username,
      password,
      timezone
    });

    const memberResponse = await MongoTeamMember.create({
      userId: response._id,
      teamId: teamId,
      role: 'owner',
      status: 'active',
      defaultTeam: true
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
