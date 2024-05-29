import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoTeam } from '@fastgpt/service/support/user/team/teamSchema';
import { mongoRPermission } from '@fastgpt/global/support/permission/utils';
import { TeamListItemType } from '@fastgpt/global/support/user/team/type';
import { authUserRole } from '@fastgpt/service/support/permission/auth/user';
import { TeamUpdateParams } from '@fastgpt/global/support/user/api';
import { GetTeamProps } from '@/global/support/api/teamReq';
export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    // const { status} =
    //  req.body as GetTeamProps;
    const status = req.query.status;
    console.log('status：' + status);
    // 凭证校验
    const { teamId, tmbId, teamOwner, role } = await authUserRole({ req, authToken: true });

    // 根据 userId 获取模型信息
    const myTeams = await MongoTeam.find(
      { ...mongoRPermission({ teamId, tmbId, role }) },
      '_id name avatar ownerId'
    ).sort({
      updateTime: -1
    });
    jsonRes<TeamListItemType[]>(res, {
      data:
        status != 'waiting'
          ? myTeams.map((team) => ({
              _id: team._id,
              avatar: team.avatar,
              teamName: team.name,
              ownerId: team.ownerId
            }))
          : []
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
