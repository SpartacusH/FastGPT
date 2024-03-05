import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import type { ParentTreePathItemType } from '@fastgpt/global/common/parentFolder/type.d';
import { getTemplateCollectionPaths } from '@fastgpt/service/core/template/collection/utils';
import { authTemplateCollection } from '@fastgpt/service/support/permission/auth/template';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();

    const { parentId } = req.query as { parentId: string };

    if (!parentId) {
      return jsonRes(res, {
        data: []
      });
    }

    await authTemplateCollection({ req, authToken: true, collectionId: parentId, per: 'r' });
    const paths = await getTemplateCollectionPaths({
      parentId
    });

    jsonRes<ParentTreePathItemType[]>(res, {
      data: paths
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
