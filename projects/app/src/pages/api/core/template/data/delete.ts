import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { withNextCors } from '@fastgpt/service/common/middle/cors';
import { connectToDatabase } from '@/service/mongo';
import { authTemplateData } from '@/service/support/permission/auth/template';
import { MongoTemplateData } from '@fastgpt/service/core/template/data/schema';
import { deleteTemplateDataVector } from '@fastgpt/service/common/vectorStore/controller';

export default withNextCors(async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { id: dataId } = req.query as {
      id: string;
    };

    if (!dataId) {
      throw new Error('dataId is required');
    }

    // 凭证校验
    const { teamId, templateData } = await authTemplateData({
      req,
      authToken: true,
      authApiKey: true,
      dataId,
      per: 'w'
    });

    // update mongo data update time
    await MongoTemplateData.findByIdAndUpdate(dataId, {
      updateTime: new Date()
    });

    // delete vector data
    await deleteTemplateDataVector({
      teamId,
      idList: templateData.indexes.map((item) => item.dataId)
    });

    // delete mongo data
    await MongoTemplateData.findByIdAndDelete(dataId);

    jsonRes(res, {
      data: 'success'
    });
  } catch (err) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
});
