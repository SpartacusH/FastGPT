import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { userId } = req.query as {
      userId: string;
    };

    if (!userId) {
      throw new Error('缺少参数');
    }
    // 删除对应的聊天
    await mongoSessionRun(async (session) => {
      await MongoUser.deleteOne({ _id: userId }, { session });
      await MongoTeamMember.deleteMany({ userId: userId }, { session });
      //await MongoTeamMember.deleteOne({userId:userId},{session});
    });

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
