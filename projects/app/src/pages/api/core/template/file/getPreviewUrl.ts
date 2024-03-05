import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { authTemplateFile } from '@fastgpt/service/support/permission/auth/template';
import { createFileToken } from '@fastgpt/service/support/permission/controller';
import { BucketNameEnum, FileBaseUrl } from '@fastgpt/global/common/file/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();

    const { fileId } = req.query as { fileId: string };

    if (!fileId) {
      throw new Error('fileId is empty');
    }

    const { teamId, tmbId } = await authTemplateFile({ req, authToken: true, fileId, per: 'r' });

    const token = await createFileToken({
      bucketName: BucketNameEnum.template,
      teamId,
      tmbId,
      fileId
    });

    jsonRes(res, {
      data: `${FileBaseUrl}?token=${token}`
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error
    });
  }
}
