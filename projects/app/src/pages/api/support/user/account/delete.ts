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
    const { teamId, tmbId, teamOwner, role, canWrite } = await authUserRole({
      req,
      authToken: true,
      authApiKey: true
    });

    //获取知识库
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

      // delete all dataset.data and pg data
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

    // 删除对应的聊天
    await mongoSessionRun(async (session) => {
      await MongoUser.deleteOne({ _id: userId }, { session });
      await MongoTeamMember.deleteMany({ userId: userId }, { session });

      //await MongoTeamMember.deleteOne({userId:userId},{session});
    });

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
