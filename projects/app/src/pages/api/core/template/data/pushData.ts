/* push data to training queue */
import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { withNextCors } from '@fastgpt/service/common/middle/cors';
import type {
  PushTemplateDataProps,
  PushTemplateDataResponse
} from '@fastgpt/global/core/template/api.d';
import { authTemplateCollection } from '@fastgpt/service/support/permission/auth/template';
import { checkTemplateLimit } from '@fastgpt/service/support/permission/limit/template';
import { predictDataLimitLength } from '@fastgpt/global/core/template/utils';
import { pushDataToTrainingQueue } from '@/service/core/template/data/controller';
import { getStandardSubPlan } from '@/service/support/wallet/sub/utils';

export default withNextCors(async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { collectionId, data } = req.body as PushTemplateDataProps;

    if (!collectionId || !Array.isArray(data)) {
      throw new Error('collectionId or data is empty');
    }

    if (data.length > 200) {
      throw new Error('Data is too long, max 200');
    }

    // 凭证校验
    const { teamId, tmbId, collection } = await authTemplateCollection({
      req,
      authToken: true,
      authApiKey: true,
      collectionId,
      per: 'w'
    });

    // auth template limit
    await checkTemplateLimit({
      teamId,
      insertLen: predictDataLimitLength(collection.trainingType, data),
      standardPlans: getStandardSubPlan()
    });

    jsonRes<PushTemplateDataResponse>(res, {
      data: await pushDataToTrainingQueue({
        ...req.body,
        teamId,
        tmbId
      })
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    },
    responseLimit: '12mb'
  }
};
