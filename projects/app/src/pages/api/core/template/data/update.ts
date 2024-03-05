import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { withNextCors } from '@fastgpt/service/common/middle/cors';
import { connectToDatabase } from '@/service/mongo';
import { updateData2Template } from '@/service/core/template/data/controller';
import { authTemplateData } from '@/service/support/permission/auth/template';
import { authTeamBalance } from '@/service/support/permission/auth/bill';
import { pushGenerateVectorBill } from '@/service/support/wallet/bill/push';
import { UpdateTemplateDataProps } from '@/global/core/template/api';

export default withNextCors(async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { id, q = '', a, indexes = [] } = req.body as UpdateTemplateDataProps;

    // auth data permission
    const {
      collection: {
        templateId: { vectorModel }
      },
      teamId,
      tmbId
    } = await authTemplateData({
      req,
      authToken: true,
      authApiKey: true,
      dataId: id,
      per: 'w'
    });

    // auth team balance
    await authTeamBalance(teamId);

    const { charsLength } = await updateData2Template({
      dataId: id,
      q,
      a,
      indexes,
      model: vectorModel
    });

    pushGenerateVectorBill({
      teamId,
      tmbId,
      charsLength,
      model: vectorModel
    });

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
});
