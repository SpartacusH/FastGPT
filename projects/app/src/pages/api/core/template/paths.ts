import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoTemplate } from '@fastgpt/service/core/template/schema';
import type { ParentTreePathItemType } from '@fastgpt/global/common/parentFolder/type.d';
import { authTemplate } from '@fastgpt/service/support/permission/auth/template';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();

    const { parentId } = req.query as { parentId: string };

    if (!parentId) {
      return jsonRes(res, {
        data: []
      });
    }

    await authTemplate({ req, authToken: true, templateId: parentId, per: 'r' });

    jsonRes<ParentTreePathItemType[]>(res, {
      data: await getParents(parentId)
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

async function getParents(parentId?: string): Promise<ParentTreePathItemType[]> {
  if (!parentId) {
    return [];
  }

  const parent = await MongoTemplate.findById(parentId, 'name parentId');

  if (!parent) return [];

  const paths = await getParents(parent.parentId);
  paths.push({ parentId, parentName: parent.name });

  return paths;
}
