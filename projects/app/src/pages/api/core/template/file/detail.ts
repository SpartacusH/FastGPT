import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { authTemplateFile } from '@fastgpt/service/support/permission/auth/template';
import { TemplateFileSchema } from '@fastgpt/global/core/template/type.d';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();

    const { fileId } = req.query as { fileId: string };
    // 凭证校验
    const { file } = await authTemplateFile({ req, authToken: true, fileId, per: 'r' });

    jsonRes<TemplateFileSchema>(res, {
      data: file
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
