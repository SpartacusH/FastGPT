import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { authReport } from '@fastgpt/service/support/permission/auth/report';

/* 获取我的模型 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { reportId } = req.query as { reportId: string };

    if (!reportId) {
      throw new Error('参数错误');
    }

    // 凭证校验
    const { report } = await authReport({ req, authToken: true, reportId, per: 'w' });

    jsonRes(res, {
      data: report
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
