/* 
    Create one template collection
*/
import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import type { LinkCreateTemplateCollectionParams } from '@fastgpt/global/core/template/api.d';
import { authTemplate } from '@fastgpt/service/support/permission/auth/template';
import { createOneCollection } from '@fastgpt/service/core/template/collection/controller';
import {
  TrainingModeEnum,
  TemplateCollectionTypeEnum
} from '@fastgpt/global/core/template/constants';
import { checkTemplateLimit } from '@fastgpt/service/support/permission/limit/template';
import { predictDataLimitLength } from '@fastgpt/global/core/template/utils';
import { createTrainingBill } from '@fastgpt/service/support/wallet/bill/controller';
import { BillSourceEnum } from '@fastgpt/global/support/wallet/bill/constants';
import { getLLMModel, getVectorModel } from '@/service/core/ai/model';
import { reloadCollectionChunks } from '@fastgpt/service/core/template/collection/utils';
import { getStandardSubPlan } from '@/service/support/wallet/sub/utils';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const {
      link,
      trainingType = TrainingModeEnum.chunk,
      chunkSize = 512,
      chunkSplitter,
      qaPrompt,
      ...body
    } = req.body as LinkCreateTemplateCollectionParams;

    const { teamId, tmbId, template } = await authTemplate({
      req,
      authToken: true,
      authApiKey: true,
      templateId: body.templateId,
      per: 'w'
    });

    // 1. check template limit
    await checkTemplateLimit({
      teamId,
      insertLen: predictDataLimitLength(trainingType, new Array(10)),
      standardPlans: getStandardSubPlan()
    });

    const { _id: collectionId } = await mongoSessionRun(async (session) => {
      // 2. create collection
      const collection = await createOneCollection({
        ...body,
        name: link,
        teamId,
        tmbId,
        type: TemplateCollectionTypeEnum.link,

        trainingType,
        chunkSize,
        chunkSplitter,
        qaPrompt,

        rawLink: link,
        session
      });

      // 3. create bill and start sync
      const { billId } = await createTrainingBill({
        teamId,
        tmbId,
        appName: 'core.template.collection.Sync Collection',
        billSource: BillSourceEnum.training,
        vectorModel: getVectorModel(template.vectorModel).name,
        agentModel: getLLMModel(template.agentModel).name,
        session
      });

      // load
      await reloadCollectionChunks({
        collection: {
          ...collection.toObject(),
          templateId: template
        },
        tmbId,
        billId,
        session
      });

      return collection;
    });

    jsonRes(res, {
      data: { collectionId }
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
