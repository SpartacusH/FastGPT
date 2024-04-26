import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { mongoRPermission } from '@fastgpt/global/support/permission/utils';
import { TeamListItemType } from '@fastgpt/global/support/user/team/type';
import { authUserRole } from '@fastgpt/service/support/permission/auth/user';
import { TeamUpdateParams } from '@fastgpt/global/support/user/api';
import { GetUserProps } from '@/global/support/api/userReq';
import { GetDatasetCollectionsProps } from '@/global/core/api/datasetReq';
import { PagingData } from '@/types';
import { UserType } from '@/global/core/support/user/type';
import { MongoDatasetCollection } from '@fastgpt/service/core/dataset/collection/schema';
import { getUserDetail } from '@fastgpt/service/support/user/controller';
export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    let { pageNum = 1, pageSize = 10, searchText = '' } = req.body as GetUserProps;
    searchText = searchText?.replace(/'/g, '');
    pageSize = Math.min(pageSize, 30);
    // 凭证校验
    const { teamId, tmbId, teamOwner, role } = await authUserRole({ req, authToken: true });

    const match = {
      ...(searchText
        ? {
            username: new RegExp(searchText, 'i')
          }
        : {}),
      ...mongoRPermission({ teamId, tmbId, role })
    };
    // 根据 userId 获取模型信息
    const myUsers = await MongoUser.find(
      match,
      '_id username password avatar balance promotionRate timezone createTime openaiAccount'
    )
      .sort({
        createTime: -1
      })
      .lean();
    let arr = [];
    for (let i = 0; i < myUsers.length; i++) {
      const tempData = await getUserDetail({ userId: myUsers[i]._id });
      arr.push(tempData);
    }
    return jsonRes<PagingData<UserType>>(res, {
      data: {
        pageNum,
        pageSize,
        data: await Promise.all(
          arr.map(async (item) => ({
            _id: item._id,
            username: item.username,
            avatar: item.avatar,
            balance: item.balance,
            timezone: item.timezone,
            promotionRate: item.promotionRate,
            openaiAccount: item.openaiAccount,
            team: item.team
          }))
        ),
        total: await MongoUser.countDocuments(match)
      }
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
