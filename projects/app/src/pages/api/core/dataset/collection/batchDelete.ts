// 修改handler函数以处理批量删除请求
import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { findCollectionAndChild } from '@fastgpt/service/core/dataset/collection/utils';
import { delCollectionAndRelatedSources } from '@fastgpt/service/core/dataset/collection/controller';
import { authDatasetCollection } from '@fastgpt/service/support/permission/auth/dataset';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();

    // 现在从请求体中获取id数组
    const { ids } = req.body as { ids: string[] };
    if (!ids || ids.length === 0) {
      throw new Error('At least one collection ID is required');
    }

    // 循环处理每个ID，或者根据实际情况调整为批处理逻辑
    for (const collectionId of ids) {
      const { teamId, collection } = await authDatasetCollection({
        req,
        authToken: true,
        authApiKey: true,
        collectionId,
        per: 'w'
      });

      // 执行与之前类似的逻辑，但针对每个ID
      const collectionsToDelete = await findCollectionAndChild({
        teamId,
        datasetId: collection.datasetId._id,
        collectionId,
        fields: '_id teamId fileId metadata'
      });

      // 批量删除操作可能需要进一步的逻辑调整以适应多个ID
      await mongoSessionRun((session) =>
        delCollectionAndRelatedSources({
          collections: collectionsToDelete,
          session
        })
      );
    }

    // 所有操作成功后，返回成功响应
    jsonRes(res, { code: 200, message: 'Collections deleted successfully' });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
