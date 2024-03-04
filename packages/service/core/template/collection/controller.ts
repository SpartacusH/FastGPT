import {
  TrainingModeEnum,
  TemplateCollectionTypeEnum
} from '@fastgpt/global/core/template/constants';
import type { CreateTemplateCollectionParams } from '@fastgpt/global/core/template/api.d';
import { MongoTemplateCollection } from './schema';
import {
  CollectionWithTemplateType,
  TemplateCollectionSchemaType
} from '@fastgpt/global/core/template/type';
import { MongoTemplateTraining } from '../training/schema';
import { delay } from '@fastgpt/global/common/system/utils';
import { MongoTemplateData } from '../data/schema';
import { delImgByRelatedId } from '../../../common/file/image/controller';
import { deleteTemplateDataVector } from '../../../common/vectorStore/controller';
import { delFileByFileIdList } from '../../../common/file/gridfs/controller';
import { BucketNameEnum } from '@fastgpt/global/common/file/constants';
import { ClientSession } from '../../../common/mongo';

export async function createOneCollection({
  teamId,
  tmbId,
  name,
  parentId,
  templateId,
  type,

  trainingType = TrainingModeEnum.chunk,
  chunkSize = 512,
  chunkSplitter,
  qaPrompt,

  fileId,
  rawLink,

  hashRawText,
  rawTextLength,
  metadata = {},
  session,
  ...props
}: CreateTemplateCollectionParams & {
  teamId: string;
  tmbId: string;
  [key: string]: any;
  session?: ClientSession;
}) {
  const [collection] = await MongoTemplateCollection.create(
    [
      {
        ...props,
        teamId,
        tmbId,
        parentId: parentId || null,
        templateId,
        name,
        type,

        trainingType,
        chunkSize,
        chunkSplitter,
        qaPrompt,

        fileId,
        rawLink,

        rawTextLength,
        hashRawText,
        metadata
      }
    ],
    { session }
  );

  // create default collection
  if (type === TemplateCollectionTypeEnum.folder) {
    await createDefaultCollection({
      templateId,
      parentId: collection._id,
      teamId,
      tmbId,
      session
    });
  }

  return collection;
}

// create default collection
export function createDefaultCollection({
  name = '手动录入',
  templateId,
  parentId,
  teamId,
  tmbId,
  session
}: {
  name?: '手动录入' | '手动标注';
  templateId: string;
  parentId?: string;
  teamId: string;
  tmbId: string;
  session?: ClientSession;
}) {
  return MongoTemplateCollection.create(
    [
      {
        name,
        teamId,
        tmbId,
        templateId,
        parentId,
        type: TemplateCollectionTypeEnum.virtual,
        trainingType: TrainingModeEnum.chunk,
        chunkSize: 0,
        updateTime: new Date('2099')
      }
    ],
    { session }
  );
}

/**
 * delete collection and it related data
 */
export async function delCollectionAndRelatedSources({
  collections,
  session
}: {
  collections: (CollectionWithTemplateType | TemplateCollectionSchemaType)[];
  session: ClientSession;
}) {
  if (collections.length === 0) return;

  const teamId = collections[0].teamId;

  if (!teamId) return Promise.reject('teamId is not exist');

  const collectionIds = collections.map((item) => String(item._id));
  const fileIdList = collections.map((item) => item?.fileId || '').filter(Boolean);
  const relatedImageIds = collections
    .map((item) => item?.metadata?.relatedImgId || '')
    .filter(Boolean);

  // delete training data
  await MongoTemplateTraining.deleteMany({
    teamId,
    collectionId: { $in: collectionIds }
  });

  await delay(2000);

  // delete template.datas
  await MongoTemplateData.deleteMany({ teamId, collectionId: { $in: collectionIds } }, { session });
  // delete imgs
  await delImgByRelatedId({
    teamId,
    relateIds: relatedImageIds,
    session
  });
  // delete collections
  await MongoTemplateCollection.deleteMany(
    {
      _id: { $in: collectionIds }
    },
    { session }
  );

  // no session delete: delete files, vector data
  await deleteTemplateDataVector({ teamId, collectionIds });
  await delFileByFileIdList({
    bucketName: BucketNameEnum.template,
    fileIdList
  });
}
