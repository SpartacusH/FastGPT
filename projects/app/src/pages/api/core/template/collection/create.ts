/* 
    Create one template collection
*/
import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import type { CreateTemplateCollectionParams } from '@fastgpt/global/core/template/api.d';
import { authTemplate } from '@fastgpt/service/support/permission/auth/template';
import { createOneCollection } from '@fastgpt/service/core/template/collection/controller';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const body = req.body as CreateTemplateCollectionParams;

    const { teamId, tmbId } = await authTemplate({
      req,
      authToken: true,
      authApiKey: true,
      templateId: body.templateId,
      per: 'w'
    });

    const { _id } = await createOneCollection({
      ...body,
      teamId,
      tmbId
    });

    jsonRes(res, {
      data: _id
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
