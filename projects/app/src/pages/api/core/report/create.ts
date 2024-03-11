import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import type { CreateReportParams } from '@fastgpt/global/core/report/api.d';
import { ReportTypeEnum } from '@fastgpt/global/core/report/constants';
import { MongoReport } from '@fastgpt/service/core/report/schema';
import { authUserNotVisitor } from '@fastgpt/service/support/permission/auth/user';
import { SimpleModeTemplate_FastGPT_Universal } from '@/global/core/report/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const {
      name = 'APP',
      avatar,
      type = ReportTypeEnum.advanced,
      modules,
      simpleTemplateId
    } = req.body as CreateReportParams;

    if (!name || !Array.isArray(modules)) {
      throw new Error('缺少参数');
    }

    // 凭证校验
    const { teamId, tmbId } = await authUserNotVisitor({ req, authToken: true });

    // 上限校验
    const authCount = await MongoReport.countDocuments({
      teamId
    });
    if (authCount >= 50) {
      throw new Error('每个团队上限 50 个应用');
    }

    // 创建模型
    const response = await MongoReport.create({
      avatar,
      name,
      teamId,
      tmbId,
      modules,
      type,
      simpleTemplateId
     // simpleTemplateId: SimpleModeTemplate_FastGPT_Universal.id
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
