import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoTemplate } from '@fastgpt/service/core/template/schema';
import type { TemplateUpdateBody } from '@fastgpt/global/core/template/api.d';
import { authTemplate } from '@fastgpt/service/support/permission/auth/template';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { id, parentId, name, avatar, intro, permission, agentModel, websiteConfig, status } =
      req.body as TemplateUpdateBody;

    if (!id) {
      throw new Error('缺少参数');
    }

    if (permission) {
      await authTemplate({ req, authToken: true, templateId: id, per: 'owner' });
    } else {
      await authTemplate({ req, authToken: true, templateId: id, per: 'w' });
    }

    await MongoTemplate.findOneAndUpdate(
      {
        _id: id
      },
      {
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(name && { name }),
        ...(avatar && { avatar }),
        ...(permission && { permission }),
        ...(agentModel && { agentModel: agentModel.model }),
        ...(websiteConfig && { websiteConfig }),
        ...(status && { status }),
        ...(intro && { intro })
      }
    );

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
