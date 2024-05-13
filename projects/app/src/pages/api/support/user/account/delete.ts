import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { mongoRPermission } from '@fastgpt/global/support/permission/utils';
import { DatasetTypeEnum } from '@fastgpt/global/core/dataset/constants';
import { authUserRole } from '@fastgpt/service/support/permission/auth/user';
import {
  delDatasetRelevantData,
  findDatasetAndAllChildren
} from '@fastgpt/service/core/dataset/controller';
import { MongoApp } from '@fastgpt/service/core/app/schema';
import { MongoChatItem } from '@fastgpt/service/core/chat/chatItemSchema';
import { MongoOutLink } from '@fastgpt/service/support/outLink/schema';
import { MongoChat } from '@fastgpt/service/core/chat/chatSchema';
import { getUserDetail } from '@fastgpt/service/support/user/controller';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { userId } = req.query as {
      userId: string;
    };

    if (!userId) {
      throw new Error('缺少参数');
    }

    const { parentId, type } = req.query as { parentId?: string; type?: `${DatasetTypeEnum}` };
    // 凭证校验
    // const { teamId, tmbId, teamOwner, role, canWrite } = await authUserRole({
    //   req,
    //   authToken: true,
    //   authApiKey: true
    // });
    const user = await MongoUser.findOne({
      _id: userId
    });
    const userDetail = await getUserDetail({
      tmbId: user?.lastLoginTmbId,
      userId: userId
    });

    const teamId = userDetail.team.teamId;
    const tmbId = userDetail.team.tmbId;
    const role = userDetail.team.role;
    //获取用户创建的知识库
    const datasets = await MongoDataset.find({
      ...mongoRPermission({ teamId, tmbId, role }),
      ...(parentId !== undefined && { parentId: parentId || null }),
      ...{ tmbId: tmbId }
    })
      .sort({ updateTime: -1 })
      .lean();

    for (let i = 0; i < datasets.length; i++) {
      let cur = datasets[i];
      const subDatasets = await findDatasetAndAllChildren({
        teamId,
        datasetId: cur._id
      });
      //删除知识库及知识库数据 delete all dataset.data and pg data
      await mongoSessionRun(async (session) => {
        // delete dataset data
        await delDatasetRelevantData({ datasets: subDatasets, session });
        await MongoDataset.deleteMany(
          {
            _id: { $in: subDatasets.map((d) => d._id) }
          },
          { session }
        );
      });
    }

    //获取用户创建的应用
    const myApps = await MongoApp.find(
      {
        ...mongoRPermission({ teamId, tmbId, role }),
        ...{ tmbId: tmbId }
      },
      '_id avatar name intro tmbId permission simpleTemplateId'
    ).sort({
      updateTime: -1
    });
    //  删除对应的聊天
    await mongoSessionRun(async (session) => {
      for (let i = 0; i < myApps.length; i++) {
        let appId = myApps[i]._id;
        await MongoChatItem.deleteMany(
          {
            appId
          },
          { session }
        );
        await MongoChat.deleteMany(
          {
            appId
          },
          { session }
        );
        // 删除分享链接
        await MongoOutLink.deleteMany(
          {
            appId
          },
          { session }
        );
        // delete app
        await MongoApp.deleteOne(
          {
            _id: appId
          },
          { session }
        );
      }
    });

    // 删除用户及用户对应的组员关系
    await mongoSessionRun(async (session) => {
      await MongoUser.deleteOne({ _id: userId }, { session });
      await MongoTeamMember.deleteMany({ userId: userId }, { session });
    });

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
