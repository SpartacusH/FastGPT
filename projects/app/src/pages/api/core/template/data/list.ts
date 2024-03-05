import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import type { TemplateDataListItemType } from '@/global/core/template/type.d';
import type { GetTemplateDataListProps } from '@/global/core/api/templateReq';
import { authTemplateCollection } from '@fastgpt/service/support/permission/auth/template';
import { MongoTemplateData } from '@fastgpt/service/core/template/data/schema';
import { PagingData } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    let {
      pageNum = 1,
      pageSize = 10,
      searchText = '',
      collectionId
    } = req.body as GetTemplateDataListProps;

    pageSize = Math.min(pageSize, 30);

    // 凭证校验
    const { teamId, collection } = await authTemplateCollection({
      req,
      authToken: true,
      authApiKey: true,
      collectionId,
      per: 'r'
    });

    searchText = searchText.replace(/'/g, '');

    const match = {
      teamId,
      templateId: collection.templateId._id,
      collectionId,
      ...(searchText
        ? {
            $or: [{ q: new RegExp(searchText, 'i') }, { a: new RegExp(searchText, 'i') }]
          }
        : {})
    };

    const [data, total] = await Promise.all([
      MongoTemplateData.find(match, '_id templateId collectionId q a chunkIndex')
        .sort({ chunkIndex: 1, updateTime: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      MongoTemplateData.countDocuments(match)
    ]);

    jsonRes<PagingData<TemplateDataListItemType>>(res, {
      data: {
        pageNum,
        pageSize,
        data,
        total
      }
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
