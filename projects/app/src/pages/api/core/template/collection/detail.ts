/* 
    Get one template collection detail
*/
import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { authTemplateCollection } from '@fastgpt/service/support/permission/auth/template';
import { TemplateCollectionItemType } from '@fastgpt/global/core/template/type';
import { BucketNameEnum } from '@fastgpt/global/common/file/constants';
import { getFileById } from '@fastgpt/service/common/file/gridfs/controller';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { id } = req.query as { id: string };

    if (!id) {
      throw new Error('Id is required');
    }

    // 凭证校验
    const { collection, canWrite } = await authTemplateCollection({
      req,
      authToken: true,
      authApiKey: true,
      collectionId: id,
      per: 'r'
    });

    // get file
    const file = collection?.fileId
      ? await getFileById({ bucketName: BucketNameEnum.template, fileId: collection.fileId })
      : undefined;

    jsonRes<TemplateCollectionItemType>(res, {
      data: {
        ...collection,
        canWrite,
        sourceName: collection?.name,
        sourceId: collection?.fileId || collection?.rawLink,
        // @ts-ignore
        file
      }
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
