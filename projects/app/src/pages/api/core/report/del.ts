import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoChat } from '@fastgpt/service/core/chat/chatSchema';
import { MongoReport } from '@fastgpt/service/core/report/schema';
import { MongoOutLink } from '@fastgpt/service/support/outLink/schema';
import { authReport } from '@fastgpt/service/support/permission/auth/report';
import { MongoChatItem } from '@fastgpt/service/core/chat/chatItemSchema';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { reportId } = req.query as { reportId: string };

    if (!reportId) {
      throw new Error('参数错误');
    }

    // 凭证校验
    await authReport({ req, authToken: true, reportId, per: 'owner' });

    // 删除对应的聊天
    await mongoSessionRun(async (session) => {
      await MongoChatItem.deleteMany(
        {
          reportId
        },
        { session }
      );
      await MongoChat.deleteMany(
        {
          reportId
        },
        { session }
      );
      // 删除分享链接
      await MongoOutLink.deleteMany(
        {
          reportId
        },
        { session }
      );
      // delete report
      await MongoReport.deleteOne(
        {
          _id: reportId
        },
        { session }
      );
    });

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
