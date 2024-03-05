import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { delFileByFileIdList, uploadFile } from '@fastgpt/service/common/file/gridfs/controller';
import { getUploadModel } from '@fastgpt/service/common/file/multer';
import { authTemplate } from '@fastgpt/service/support/permission/auth/template';
import { FileCreateTemplateCollectionParams } from '@fastgpt/global/core/template/api';
import { removeFilesByPaths } from '@fastgpt/service/common/file/utils';
import { createOneCollection } from '@fastgpt/service/core/template/collection/controller';
import { TemplateCollectionTypeEnum } from '@fastgpt/global/core/template/constants';
import { BucketNameEnum } from '@fastgpt/global/common/file/constants';

/**
 * Creates the multer uploader
 */
const upload = getUploadModel({
  maxSize: 500 * 1024 * 1024
});

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  let filePaths: string[] = [];
  let fileId: string = '';
  const { templateId } = req.query as { templateId: string };

  try {
    await connectToDatabase();

    const { teamId, tmbId } = await authTemplate({
      req,
      authToken: true,
      authApiKey: true,
      per: 'w',
      templateId
    });

    const { file, bucketName, data } = await upload.doUpload<FileCreateTemplateCollectionParams>(
      req,
      res
    );
    filePaths = [file.path];

    if (!file || !bucketName) {
      throw new Error('file is empty');
    }

    const { fileMetadata, collectionMetadata, ...collectionData } = data;

    // upload file and create collection
    fileId = await uploadFile({
      teamId,
      tmbId,
      bucketName,
      path: file.path,
      filename: file.originalname,
      contentType: file.mimetype,
      metadata: fileMetadata
    });

    // create collection
    const { _id: collectionId } = await createOneCollection({
      ...collectionData,
      metadata: collectionMetadata,
      teamId,
      tmbId,
      type: TemplateCollectionTypeEnum.file,
      fileId
    });

    jsonRes(res, {
      data: collectionId
    });
  } catch (error) {
    if (fileId) {
      try {
        await delFileByFileIdList({
          fileIdList: [fileId],
          bucketName: BucketNameEnum.template
        });
      } catch (error) {}
    }
    jsonRes(res, {
      code: 500,
      error
    });
  }

  removeFilesByPaths(filePaths);
}

export const config = {
  api: {
    bodyParser: false
  }
};
