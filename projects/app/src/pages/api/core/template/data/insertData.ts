/* 
  insert one data to template (immediately insert)
  manual input or mark data
*/
import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { withNextCors } from '@fastgpt/service/common/middle/cors';
import { countPromptTokens } from '@fastgpt/global/common/string/tiktoken';
import { getVectorModel } from '@/service/core/ai/model';
import { hasSameValue } from '@/service/core/template/data/utils';
import { insertData2Template } from '@/service/core/template/data/controller';
import { authTemplateCollection } from '@fastgpt/service/support/permission/auth/template';
import { getCollectionWithTemplate } from '@fastgpt/service/core/template/controller';
import { authTeamBalance } from '@/service/support/permission/auth/bill';
import { pushGenerateVectorBill } from '@/service/support/wallet/bill/push';
import { InsertOneTemplateDataProps } from '@/global/core/template/api';
import { simpleText } from '@fastgpt/global/common/string/tools';
import { checkTemplateLimit } from '@fastgpt/service/support/permission/limit/template';
import { getStandardSubPlan } from '@/service/support/wallet/sub/utils';

export default withNextCors(async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { collectionId, q, a, indexes } = req.body as InsertOneTemplateDataProps;

    if (!q) {
      return Promise.reject('q is required');
    }

    if (!collectionId) {
      return Promise.reject('collectionId is required');
    }

    // 凭证校验
    const { teamId, tmbId } = await authTemplateCollection({
      req,
      authToken: true,
      authApiKey: true,
      collectionId,
      per: 'w'
    });

    await checkTemplateLimit({
      teamId,
      insertLen: 1,
      standardPlans: getStandardSubPlan()
    });

    // auth collection and get template
    const [
      {
        templateId: { _id: templateId, vectorModel }
      }
    ] = await Promise.all([getCollectionWithTemplate(collectionId), authTeamBalance(teamId)]);

    // format data
    const formatQ = simpleText(q);
    const formatA = simpleText(a);
    const formatIndexes = indexes?.map((item) => ({
      ...item,
      text: simpleText(item.text)
    }));

    // token check
    const token = countPromptTokens(formatQ, 'system');
    const vectorModelData = getVectorModel(vectorModel);

    if (token > vectorModelData.maxToken) {
      return Promise.reject('Q Over Tokens');
    }

    // Duplicate data check
    await hasSameValue({
      teamId,
      collectionId,
      q: formatQ,
      a: formatA
    });

    const { insertId, charsLength } = await insertData2Template({
      teamId,
      tmbId,
      templateId,
      collectionId,
      q: formatQ,
      a: formatA,
      chunkIndex: 0,
      model: vectorModelData.model,
      indexes: formatIndexes
    });

    pushGenerateVectorBill({
      teamId,
      tmbId,
      charsLength,
      model: vectorModelData.model
    });

    jsonRes<string>(res, {
      data: insertId
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
});
