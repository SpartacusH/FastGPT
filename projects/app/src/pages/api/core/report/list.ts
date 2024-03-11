import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoReport } from '@fastgpt/service/core/report/schema';
import { mongoRPermission } from '@fastgpt/global/support/permission/utils';
import { ReportListItemType } from '@fastgpt/global/core/report/type';
import { authUserRole } from '@fastgpt/service/support/permission/auth/user';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    // 凭证校验
    const { teamId, tmbId, teamOwner, role } = await authUserRole({ req, authToken: true });

    // 根据 userId 获取模型信息
    const myReports = await MongoReport.find(
      { ...mongoRPermission({ teamId, tmbId, role }) },
      '_id avatar name intro tmbId permission simpleTemplateId'
    ).sort({
      updateTime: -1
    });
    jsonRes<ReportListItemType[]>(res, {
      data: myReports.map((report) => ({
        _id: report._id,
        avatar: report.avatar,
        name: report.name,
        intro: report.intro,
        simpleTemplateId: report.simpleTemplateId,
        isOwner: teamOwner || String(report.tmbId) === tmbId,
        permission: report.permission
      }))
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
