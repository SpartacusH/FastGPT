import { TemplateDataItemType } from '@fastgpt/global/core/template/type';
import { MongoTemplateData } from '@fastgpt/service/core/template/data/schema';
import { authTemplateCollection } from '@fastgpt/service/support/permission/auth/template';
import { AuthModeType } from '@fastgpt/service/support/permission/type';

/* data permission same of collection */
export async function authTemplateData({
  dataId,
  ...props
}: AuthModeType & {
  dataId: string;
}) {
  // get pg data
  const templateData = await MongoTemplateData.findById(dataId);

  if (!templateData) {
    return Promise.reject('core.template.error.Data not found');
  }

  const result = await authTemplateCollection({
    ...props,
    collectionId: templateData.collectionId
  });

  const data: TemplateDataItemType = {
    id: String(templateData._id),
    q: templateData.q,
    a: templateData.a,
    chunkIndex: templateData.chunkIndex,
    indexes: templateData.indexes,
    templateId: String(templateData.templateId),
    collectionId: String(templateData.collectionId),
    sourceName: result.collection.name || '',
    sourceId: result.collection?.fileId || result.collection?.rawLink,
    isOwner: String(templateData.tmbId) === result.tmbId,
    canWrite: result.canWrite
  };

  return {
    ...result,
    templateData: data
  };
}
