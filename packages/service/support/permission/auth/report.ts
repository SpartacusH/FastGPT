import { MongoReport } from '../../../core/report/schema';
import { ReportDetailType } from '@fastgpt/global/core/report/type.d';
import { AuthModeType } from '../type';
import { AuthResponseType } from '@fastgpt/global/support/permission/type';
import { TeamMemberRoleEnum } from '@fastgpt/global/support/user/team/constant';
import { parseHeaderCert } from '../controller';
import { PermissionTypeEnum } from '@fastgpt/global/support/permission/constant';
import { ReportErrEnum } from '@fastgpt/global/common/error/code/report';
import { getTmbInfoByTmbId } from '../../user/team/controller';

// 模型使用权校验
export async function authReport({
  reportId,
  per = 'owner',
  ...props
}: AuthModeType & {
  reportId: string;
}): Promise<
  AuthResponseType & {
    teamOwner: boolean;
    report: ReportDetailType;
    role: `${TeamMemberRoleEnum}`;
  }
> {
  const result = await parseHeaderCert(props);
  const { teamId, tmbId } = result;
  const { role } = await getTmbInfoByTmbId({ tmbId });

  const { report, isOwner, canWrite } = await (async () => {
    // get report
    const report = await MongoReport.findOne({ _id: reportId, teamId }).lean();
    if (!report) {
      return Promise.reject(ReportErrEnum.unAuthReport);
    }

    const isOwner =
      role !== TeamMemberRoleEnum.visitor &&
      (String(report.tmbId) === tmbId || role === TeamMemberRoleEnum.owner);
    const canWrite =
      isOwner ||
      (report.permission === PermissionTypeEnum.public && role !== TeamMemberRoleEnum.visitor);

    if (per === 'r') {
      if (!isOwner && report.permission !== PermissionTypeEnum.public) {
        return Promise.reject(ReportErrEnum.unAuthReport);
      }
    }
    if (per === 'w' && !canWrite) {
      return Promise.reject(ReportErrEnum.unAuthReport);
    }
    if (per === 'owner' && !isOwner) {
      return Promise.reject(ReportErrEnum.unAuthReport);
    }

    return {
      report: {
        ...report,
        isOwner,
        canWrite
      },
      isOwner,
      canWrite
    };
  })();

  return {
    ...result,
    report,
    role,
    isOwner,
    canWrite,
    teamOwner: role === TeamMemberRoleEnum.owner
  };
}
