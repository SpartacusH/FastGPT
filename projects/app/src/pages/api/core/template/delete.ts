import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { authTemplate } from '@fastgpt/service/support/permission/auth/template';
import { delTemplateRelevantData } from '@fastgpt/service/core/template/controller';
import { findTemplateAndAllChildren } from '@fastgpt/service/core/template/controller';
import { MongoTemplate } from '@fastgpt/service/core/template/schema';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { id: templateId } = req.query as {
      id: string;
    };

    if (!templateId) {
      throw new Error('缺少参数');
    }

    // auth owner
    const { teamId } = await authTemplate({
      req,
      authToken: true,
      authApiKey: true,
      templateId,
      per: 'owner'
    });

    const templates = await findTemplateAndAllChildren({
      teamId,
      templateId
    });

    // delete all template.data and pg data
    await mongoSessionRun(async (session) => {
      // delete template data
      await delTemplateRelevantData({ templates, session });
      await MongoTemplate.deleteMany(
        {
          _id: { $in: templates.map((d) => d._id) }
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
