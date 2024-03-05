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
      name,
      type = TemplateTypeEnum.template,
      avatar,
      vectorModel = global.vectorModels[0].model,
      agentModel = getTemplateModel().model
    } = req.body as CreateTemplateParams;

    // auth
    const { teamId, tmbId } = await authUserNotVisitor({ req, authToken: true, authApiKey: true });

    // check model valid
    const vectorModelStore = getVectorModel(vectorModel);
    const agentModelStore = getLLMModel(agentModel);
    if (!vectorModelStore || !agentModelStore) {
      throw new Error('vectorModel or qaModel is invalid');
    }

    // check limit
    const authCount = await MongoTemplate.countDocuments({
      teamId,
      type: TemplateTypeEnum.template
    });
    if (authCount >= 50) {
      throw new Error('每个团队上限 50 个知识库');
    }

    const { _id } = await MongoTemplate.create({
      name,
      teamId,
      tmbId,
      vectorModel,
      agentModel,
      avatar,
      parentId: parentId || null,
      type
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
