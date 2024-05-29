import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import type { DatasetListItemType } from '@fastgpt/global/core/dataset/type.d';
import { DatasetTypeEnum } from '@fastgpt/global/core/dataset/constants';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { mongoRPermission } from '@fastgpt/global/support/permission/utils';
import { authUserRole } from '@fastgpt/service/support/permission/auth/user';
import { getVectorModel } from '@/service/core/ai/model';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { getUserDetail } from '@fastgpt/service/support/user/controller';
import { UserType } from '@fastgpt/global/support/user/type';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { parentId, type } = req.query as { parentId?: string; type?: `${DatasetTypeEnum}` };
    // 凭证校验
    const { teamId, tmbId, teamOwner, role, canWrite } = await authUserRole({
      req,
      authToken: true,
      authApiKey: true
    });

    const datasets = await MongoDataset.find({
      ...mongoRPermission({ teamId, tmbId, role }),
      ...(parentId !== undefined && { parentId: parentId || null }),
      $or: [{ permission: 'public' }, { permission: 'private', tmbId: tmbId }],
      ...(type && { type })
    })
      .sort({ updateTime: -1 })
      .lean();

    // 获取用户信息
    const myUsers = await MongoUser.find(
      {},
      '_id username password avatar balance promotionRate timezone createTime openaiAccount'
    )
      .sort({
        createTime: -1
      })
      .lean();
    let arr: UserType[] = [];
    for (let i = 0; i < myUsers.length; i++) {
      const tempData = await getUserDetail({ userId: myUsers[i]._id });
      arr.push(tempData);
    }

    const data = await Promise.all(
      datasets.map<DatasetListItemType>((item) => ({
        _id: item._id,
        tmbId: item.tmbId,
        // @ts-ignore
        username: arr.find((cur) => cur.team.tmbId == item.tmbId)?.username,
        parentId: item.parentId,
        avatar: item.avatar,
        name: item.name,
        intro: item.intro,
        type: item.type,
        permission: item.permission,
        canWrite,
        isOwner: teamOwner || String(item.tmbId) === tmbId,
        vectorModel: getVectorModel(item.vectorModel)
      }))
    );

    jsonRes<DatasetListItemType[]>(res, {
      data
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
