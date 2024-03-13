import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { authTemplateFile } from '@fastgpt/service/support/permission/auth/template';
import { createFileToken } from '@fastgpt/service/support/permission/controller';
import { BucketNameEnum, FileBaseUrl } from '@fastgpt/global/common/file/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  console.log("第-2步");
  try {
    console.log("第-1步");
    await connectToDatabase();
    console.log("第0步");
    const { fileId } = req.query as { fileId: string };

    if (!fileId) {
      throw new Error('fileId is empty');
    }
    console.log("第一步");
    const { teamId, tmbId } = await authTemplateFile({ req, authToken: true, fileId, per: 'r' });
    console.log("第二步");
    const token = await createFileToken({
      bucketName: BucketNameEnum.template,
      teamId,
      tmbId,
      fileId
    });
    console.log("第三步");
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
