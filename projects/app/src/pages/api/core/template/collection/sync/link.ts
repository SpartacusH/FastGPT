import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { authTemplateCollection } from '@fastgpt/service/support/permission/auth/template';
import {
  getCollectionAndRawText,
  reloadCollectionChunks
} from '@fastgpt/service/core/template/collection/utils';
import { delCollectionAndRelatedSources } from '@fastgpt/service/core/template/collection/controller';
import {
  TemplateCollectionSyncResultEnum,
  TemplateCollectionTypeEnum
} from '@fastgpt/global/core/template/constants';
import { TemplateErrEnum } from '@fastgpt/global/common/error/code/template';
import { createTrainingBill } from '@fastgpt/service/support/wallet/bill/controller';
import { BillSourceEnum } from '@fastgpt/global/support/wallet/bill/constants';
import { getLLMModel, getVectorModel } from '@/service/core/ai/model';
import { createOneCollection } from '@fastgpt/service/core/template/collection/controller';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();

    const { collectionId } = req.body as { collectionId: string };

    if (!collectionId) {
      throw new Error('CollectionIdId is required');
    }

    const { collection, tmbId } = await authTemplateCollection({
      req,
      authToken: true,
      collectionId,
      per: 'w'
    });

    if (collection.type !== TemplateCollectionTypeEnum.link || !collection.rawLink) {
      return Promise.reject(TemplateErrEnum.unLinkCollection);
    }

    const { title, rawText, isSameRawText } = await getCollectionAndRawText({
      collection
    });

    if (isSameRawText) {
      return jsonRes(res, {
        data: TemplateCollectionSyncResultEnum.sameRaw
      });
    }

    /* Not the same original text, create and reload */

    const vectorModelData = getVectorModel(collection.templateId.vectorModel);
    const agentModelData = getLLMModel(collection.templateId.agentModel);

    await mongoSessionRun(async (session) => {
      // create training bill
      const { billId } = await createTrainingBill({
        teamId: collection.teamId,
        tmbId,
        appName: 'core.template.collection.Sync Collection',
        billSource: BillSourceEnum.training,
        vectorModel: vectorModelData.name,
        agentModel: agentModelData.name,
        session
      });

      // create a collection and delete old
      const newCol = await createOneCollection({
        teamId: collection.teamId,
        tmbId: collection.tmbId,
        parentId: collection.parentId,
        templateId: collection.templateId._id,
        name: title || collection.name,
        type: collection.type,
        trainingType: collection.trainingType,
        chunkSize: collection.chunkSize,
        fileId: collection.fileId,
        rawLink: collection.rawLink,
        metadata: collection.metadata,
        createTime: collection.createTime,
        session
      });

      // start load
      await reloadCollectionChunks({
        collection: {
          ...newCol.toObject(),
          templateId: collection.templateId
        },
        tmbId,
        billId,
        rawText,
        session
      });

      // delete old collection
      await delCollectionAndRelatedSources({
        collections: [collection],
        session
      });
    });

    jsonRes(res, {
      data: TemplateCollectionSyncResultEnum.success
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
