import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { TemplateTrainingCollectionName } from '@fastgpt/service/core/template/training/schema';
import { Types } from '@fastgpt/service/common/mongo';
import type { TemplateCollectionsListItemType } from '@/global/core/template/type.d';
import type { GetTemplateCollectionsProps } from '@/global/core/api/templateReq';
import { PagingData } from '@/types';
import { MongoTemplateCollection } from '@fastgpt/service/core/template/collection/schema';
import { TemplateCollectionTypeEnum } from '@fastgpt/global/core/template/constants';
import { startQueue } from '@/service/utils/tools';
import { authTemplate } from '@fastgpt/service/support/permission/auth/template';
import { TemplateDataCollectionName } from '@fastgpt/service/core/template/data/schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();

    let {
      pageNum = 1,
      pageSize = 10,
      templateId,
      parentId = null,
      searchText = '',
      selectFolder = false,
      simple = false
    } = req.body as GetTemplateCollectionsProps;
    searchText = searchText?.replace(/'/g, '');
    pageSize = Math.min(pageSize, 30);

    // auth template and get my role
    const { teamId, tmbId, canWrite } = await authTemplate({
      req,
      authToken: true,
      authApiKey: true,
      templateId,
      per: 'r'
    });

    const match = {
      teamId: new Types.ObjectId(teamId),
      templateId: new Types.ObjectId(templateId),
      parentId: parentId ? new Types.ObjectId(parentId) : null,
      ...(selectFolder ? { type: TemplateCollectionTypeEnum.folder } : {}),
      ...(searchText
        ? {
            name: new RegExp(searchText, 'i')
          }
        : {})
    };

    // not count data amount
    if (simple) {
      const collections = await MongoTemplateCollection.find(match, '_id parentId type name')
        .sort({
          updateTime: -1
        })
        .lean();
      return jsonRes<PagingData<TemplateCollectionsListItemType>>(res, {
        data: {
          pageNum,
          pageSize,
          data: await Promise.all(
            collections.map(async (item) => ({
              ...item,
              dataAmount: 0,
              trainingAmount: 0,
              canWrite // admin or team owner can write
            }))
          ),
          total: await MongoTemplateCollection.countDocuments(match)
        }
      });
    }

    const [collections, total]: [TemplateCollectionsListItemType[], number] = await Promise.all([
      MongoTemplateCollection.aggregate([
        {
          $match: match
        },
        {
          $sort: { updateTime: -1 }
        },
        {
          $skip: (pageNum - 1) * pageSize
        },
        {
          $limit: pageSize
        },
        // count training data
        {
          $lookup: {
            from: TemplateTrainingCollectionName,
            let: { id: '$_id', team_id: match.teamId, template_id: match.templateId },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$teamId', '$$team_id'] }, { $eq: ['$collectionId', '$$id'] }]
                  }
                }
              },
              { $count: 'count' }
            ],
            as: 'trainingCount'
          }
        },
        // count collection total data
        {
          $lookup: {
            from: TemplateDataCollectionName,
            let: { id: '$_id', team_id: match.teamId, template_id: match.templateId },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$teamId', '$$team_id'] },
                      { $eq: ['$templateId', '$$template_id'] },
                      { $eq: ['$collectionId', '$$id'] }
                    ]
                  }
                }
              },
              { $count: 'count' }
            ],
            as: 'dataCount'
          }
        },
        {
          $project: {
            _id: 1,
            parentId: 1,
            tmbId: 1,
            name: 1,
            type: 1,
            status: 1,
            updateTime: 1,
            fileId: 1,
            rawLink: 1,
            dataAmount: {
              $ifNull: [{ $arrayElemAt: ['$dataCount.count', 0] }, 0]
            },
            trainingAmount: {
              $ifNull: [{ $arrayElemAt: ['$trainingCount.count', 0] }, 0]
            }
          }
        }
      ]),
      MongoTemplateCollection.countDocuments(match)
    ]);

    const data = await Promise.all(
      collections.map(async (item, i) => ({
        ...item,
        canWrite: String(item.tmbId) === tmbId || canWrite
      }))
    );

    if (data.find((item) => item.trainingAmount > 0)) {
      startQueue();
    }

    // count collections
    jsonRes<PagingData<TemplateCollectionsListItemType>>(res, {
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
