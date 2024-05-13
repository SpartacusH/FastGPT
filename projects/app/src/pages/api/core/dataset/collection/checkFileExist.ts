import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import type { DatasetListItemType } from '@fastgpt/global/core/dataset/type';
import { DatasetTypeEnum } from '@fastgpt/global/core/dataset/constants';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { mongoRPermission } from '@fastgpt/global/support/permission/utils';
import { authUserRole } from '@fastgpt/service/support/permission/auth/user';
import { getVectorModel } from '@/service/core/ai/model';
import { MongoDatasetCollection } from '@fastgpt/service/core/dataset/collection/schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { datasetId, fileName } = req.query as { datasetId?: string; fileName?: string };
    // 凭证校验
    const { teamId, tmbId, teamOwner, role, canWrite } = await authUserRole({
      req,
      authToken: true,
      authApiKey: true
    });

    const collections = await MongoDatasetCollection.find({
      ...mongoRPermission({ teamId, tmbId, role }),
      ...(datasetId !== undefined && { datasetId: datasetId }),
      ...(fileName !== undefined && { name: fileName })
    })
      .sort({ updateTime: -1 })
      .lean();

    jsonRes<boolean>(res, {
      data: collections.length > 0 ? true : false
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
