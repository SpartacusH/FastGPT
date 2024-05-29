import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoTeam } from '@fastgpt/service/support/user/team/teamSchema';
import { mongoRPermission } from '@fastgpt/global/support/permission/utils';
import { TeamItemType, TeamListItemType } from '@fastgpt/global/support/user/team/type';
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
    // @ts-ignore
    jsonRes<TeamItemType[]>(res, {
      data:
        status != 'waiting'
          ? myTeams.map((team) => ({
              userId: team.ownerId,
              teamId: team._id,
              teamName: team.name,
              avatar: team.avatar,
              balance: team.balance,
              defaultTeam: true,
              memberName: '',
              tmbId: '',
              role: 'admin',
              status: 'active',
              canWrite: true,
              maxSize: 999
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
