import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import type { UpdateTemplateCollectionParams } from '@/global/core/api/templateReq.d';
import { MongoTemplateCollection } from '@fastgpt/service/core/template/collection/schema';
import { getCollectionUpdateTime } from '@fastgpt/service/core/template/collection/utils';
import { authTemplateCollection } from '@fastgpt/service/support/permission/auth/template';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { id, parentId, name } = req.body as UpdateTemplateCollectionParams;

    if (!id) {
      throw new Error('缺少参数');
    }

    // 凭证校验
    await authTemplateCollection({
      req,
      authToken: true,
      authApiKey: true,
      collectionId: id,
      per: 'w'
    });

    const updateFields: Record<string, any> = {
      ...(parentId !== undefined && { parentId: parentId || null }),
      ...(name && { name, updateTime: getCollectionUpdateTime({ name }) })
    };

    await MongoTemplateCollection.findByIdAndUpdate(id, {
      $set: updateFields
    });

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
