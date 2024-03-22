import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
// @ts-ignore
import { getLLMModel, getVectorModel } from '@/service/core/ai/model';
import type { TemplateItemType } from '@fastgpt/global/core/template/type.d';
import { authTemplate } from '@fastgpt/service/support/permission/auth/template';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { id: templateId } = req.query as {
      id: string;
    };

    if (!templateId) {
      throw new Error('缺少参数');
    }

    // 凭证校验
    const { template, canWrite, isOwner } = await authTemplate({
      req,
      authToken: true,
      authApiKey: true,
      templateId,
      per: 'r'
    });

    jsonRes<TemplateItemType>(res, {
      // @ts-ignore
      data: {
        ...template,
        canWrite,
        isOwner
      }
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
