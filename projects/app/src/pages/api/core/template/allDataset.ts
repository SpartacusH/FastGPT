import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoTemplate } from '@fastgpt/service/core/template/schema';
import { getVectorModel } from '@/service/core/ai/model';
import type { TemplateListItemType } from '@fastgpt/global/core/template/type.d';
import { mongoRPermission } from '@fastgpt/global/support/permission/utils';
import { authUserRole } from '@fastgpt/service/support/permission/auth/user';
import { TemplateTypeEnum } from '@fastgpt/global/core/template/constants';

/* get all template by teamId or tmbId */
export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    // 凭证校验
    const { teamId, tmbId, teamOwner, role } = await authUserRole({ req, authToken: true });

    const templates = await MongoTemplate.find({
      ...mongoRPermission({ teamId, tmbId, role }),
      type: { $ne: TemplateTypeEnum.folder }
    }).lean();

    const data = templates.map((item) => ({
      _id: item._id,
      parentId: item.parentId,
      avatar: item.avatar,
      name: item.name,
      intro: item.intro,
      type: item.type,
      permission: item.permission,
      vectorModel: getVectorModel(item.vectorModel),
      canWrite: String(item.tmbId) === tmbId,
      isOwner: teamOwner || String(item.tmbId) === tmbId
    }));

    jsonRes<TemplateListItemType[]>(res, {
      data
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
