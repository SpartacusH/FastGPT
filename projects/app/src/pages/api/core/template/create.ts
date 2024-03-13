import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoTemplate } from '@fastgpt/service/core/template/schema';
import type { CreateTemplateParams } from '@/global/core/template/api.d';
import { createDefaultCollection } from '@fastgpt/service/core/template/collection/controller';
import { authUserNotVisitor } from '@fastgpt/service/support/permission/auth/user';
import { TemplateTypeEnum } from '@fastgpt/global/core/template/constants';
import { getLLMModel, getVectorModel, getTemplateModel } from '@/service/core/ai/model';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const {
      parentId,
      type = TemplateTypeEnum.template,
      name,
      intro,
      avatar,
      fileId,
      fileName,
    } = req.body as CreateTemplateParams;

    // auth
    const { teamId, tmbId } = await authUserNotVisitor({ req, authToken: true, authApiKey: true });


    // check limit
    const authCount = await MongoTemplate.countDocuments({
      teamId,
      type: TemplateTypeEnum.template
    });
    if (authCount >= 100) {
      throw new Error('每个团队上限 100 个模板');
    }

    const { _id } = await MongoTemplate.create({
      name:name,
      teamId:teamId,
      tmbId:tmbId,
      avatar:avatar,
      intro: intro,
      fileId:fileId,
      fileName:fileName,
      parentId: parentId || null,
      type:type
    });

    if (type === TemplateTypeEnum.template) {
      await createDefaultCollection({
        templateId: _id,
        teamId,
        tmbId
      });
    }

    jsonRes(res, { data: _id });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
