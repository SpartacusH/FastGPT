import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoChat } from '@fastgpt/service/core/chat/chatSchema';
import type { PagingData } from '@/types';
import { ReportLogsListItemType } from '@/types/report';
import { Types } from '@fastgpt/service/common/mongo';
import { addDays } from 'date-fns';
// @ts-ignore
import type { GetReportChatLogsParams } from '@/global/core/api/reportReq.d';
import { authReport } from '@fastgpt/service/support/permission/auth/report';
import { ChatItemCollectionName } from '@fastgpt/service/core/chat/chatItemSchema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();
    const {
      pageNum = 1,
      pageSize = 20,
      reportId,
      dateStart = addDays(new Date(), -7),
      dateEnd = new Date()
    } = req.body as GetReportChatLogsParams;

    if (!reportId) {
      throw new Error('缺少参数');
    }

    // 凭证校验
    const { teamId } = await authReport({ req, authToken: true, reportId, per: 'w' });

    const where = {
      teamId: new Types.ObjectId(teamId),
      reportId: new Types.ObjectId(reportId),
      updateTime: {
        $gte: new Date(dateStart),
        $lte: new Date(dateEnd)
      }
    };

    const [data, total] = await Promise.all([
      MongoChat.aggregate([
        { $match: where },
        {
          $sort: {
            userBadFeedbackCount: -1,
            userGoodFeedbackCount: -1,
            customFeedbacksCount: -1,
            updateTime: -1
          }
        },
        { $skip: (pageNum - 1) * pageSize },
        { $limit: pageSize },
        {
          $lookup: {
            from: ChatItemCollectionName,
            let: { chatId: '$chatId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$reportId', new Types.ObjectId(reportId)] },
                      { $eq: ['$chatId', '$$chatId'] }
                    ]
                  }
                }
              },
              {
                $project: {
                  userGoodFeedback: 1,
                  userBadFeedback: 1,
                  customFeedbacks: 1,
                  adminFeedback: 1
                }
              }
            ],
            as: 'chatitems'
          }
        },
        {
          $addFields: {
            userGoodFeedbackCount: {
              $size: {
                $filter: {
                  input: '$chatitems',
                  as: 'item',
                  cond: { $ifNull: ['$$item.userGoodFeedback', false] }
                }
              }
            },
            userBadFeedbackCount: {
              $size: {
                $filter: {
                  input: '$chatitems',
                  as: 'item',
                  cond: { $ifNull: ['$$item.userBadFeedback', false] }
                }
              }
            },
            customFeedbacksCount: {
              $size: {
                $filter: {
                  input: '$chatitems',
                  as: 'item',
                  cond: { $gt: [{ $size: { $ifNull: ['$$item.customFeedbacks', []] } }, 0] }
                }
              }
            },
            markCount: {
              $size: {
                $filter: {
                  input: '$chatitems',
                  as: 'item',
                  cond: { $ifNull: ['$$item.adminFeedback', false] }
                }
              }
            }
          }
        },
        {
          $project: {
            _id: 1,
            id: '$chatId',
            title: 1,
            source: 1,
            time: '$updateTime',
            messageCount: { $size: '$chatitems' },
            userGoodFeedbackCount: 1,
            userBadFeedbackCount: 1,
            customFeedbacksCount: 1,
            markCount: 1
          }
        }
      ]),
      MongoChat.countDocuments(where)
    ]);

    jsonRes<PagingData<ReportLogsListItemType>>(res, {
      data: {
        pageNum,
        pageSize,
        data,
        total
      }
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error
    });
  }
}
