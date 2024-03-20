import { AuthModeType } from '../type';
import { parseHeaderCert } from '../controller';
import { TemplateErrEnum } from '@fastgpt/global/common/error/code/template';
import { MongoTemplate } from '../../../core/template/schema';
import { getCollectionWithTemplate } from '../../../core/template/controller';
import { PermissionTypeEnum } from '@fastgpt/global/support/permission/constant';
import { TeamMemberRoleEnum } from '@fastgpt/global/support/user/team/constant';
import { AuthResponseType } from '@fastgpt/global/support/permission/type';
import {
  CollectionWithTemplateType,
  TemplateFileSchema,
  TemplateSchemaType
} from '@fastgpt/global/core/template/type';

import { DatasetFileSchema } from '@fastgpt/global/core/dataset/type';
import { getFileById } from '../../../common/file/gridfs/controller';
import { BucketNameEnum } from '@fastgpt/global/common/file/constants';
import { getTmbInfoByTmbId } from '../../user/team/controller';
import { CommonErrEnum } from '@fastgpt/global/common/error/code/common';
import { MongoTemplateCollection } from '../../../core/template/collection/schema';

export async function authTemplateByTmbId({
  teamId,
  tmbId,
  templateId,
  per
}: {
  teamId: string;
  tmbId: string;
  templateId: string;
  per: AuthModeType['per'];
}) {
  const { role } = await getTmbInfoByTmbId({ tmbId });

  const { template, isOwner, canWrite } = await (async () => {
    const template = await MongoTemplate.findOne({ _id: templateId, teamId }).lean();

    if (!template) {
      return Promise.reject(TemplateErrEnum.unAuthTemplate);
    }

    const isOwner =
      role !== TeamMemberRoleEnum.visitor &&
      (String(template.tmbId) === tmbId || role === TeamMemberRoleEnum.owner);
    const canWrite =
      isOwner ||
      (role !== TeamMemberRoleEnum.visitor && template.permission === PermissionTypeEnum.public);
    if (per === 'r') {
      if (!isOwner && template.permission !== PermissionTypeEnum.public) {
        return Promise.reject(TemplateErrEnum.unAuthTemplate);
      }
    }
    if (per === 'w' && !canWrite) {
      return Promise.reject(TemplateErrEnum.unAuthTemplate);
    }
    if (per === 'owner' && !isOwner) {
      return Promise.reject(TemplateErrEnum.unAuthTemplate);
    }

    return { template, isOwner, canWrite };
  })();

  return {
    template,
    isOwner,
    canWrite
  };
}
export async function authTemplate({
  templateId,
  per = 'owner',
  ...props
}: AuthModeType & {
  templateId: string;
}): Promise<
  AuthResponseType & {
    template: TemplateSchemaType;
  }
> {
  const result = await parseHeaderCert(props);
  const { teamId, tmbId } = result;
  const { template, isOwner, canWrite } = await authTemplateByTmbId({
    teamId,
    tmbId,
    templateId,
    per
  });

  return {
    ...result,
    template,
    isOwner,
    canWrite
  };
}

/* 
   Read: in team and template permission is public
   Write: in team, not visitor and template permission is public
*/
export async function authTemplateCollection({
  collectionId,
  per = 'owner',
  ...props
}: AuthModeType & {
  collectionId: string;
}): Promise<
  AuthResponseType & {
    collection: CollectionWithTemplateType;
  }
> {
  const { userId, teamId, tmbId } = await parseHeaderCert(props);
  const { role } = await getTmbInfoByTmbId({ tmbId });

  const { collection, isOwner, canWrite } = await (async () => {
    const collection = await getCollectionWithTemplate(collectionId);

    if (!collection || String(collection.teamId) !== teamId) {
      return Promise.reject(TemplateErrEnum.unAuthTemplateCollection);
    }

    const isOwner = String(collection.tmbId) === tmbId || role === TeamMemberRoleEnum.owner;
    const canWrite =
      isOwner ||
      (role !== TeamMemberRoleEnum.visitor &&
        collection.templateId.permission === PermissionTypeEnum.public);

    if (per === 'r') {
      if (!isOwner && collection.templateId.permission !== PermissionTypeEnum.public) {
        return Promise.reject(TemplateErrEnum.unAuthTemplateCollection);
      }
    }
    if (per === 'w' && !canWrite) {
      return Promise.reject(TemplateErrEnum.unAuthTemplateCollection);
    }
    if (per === 'owner' && !isOwner) {
      return Promise.reject(TemplateErrEnum.unAuthTemplateCollection);
    }

    return {
      collection,
      isOwner,
      canWrite
    };
  })();

  return {
    userId,
    teamId,
    tmbId,
    collection,
    isOwner,
    canWrite
  };
}

export async function authTemplateFile({
  fileId,
  per = 'owner',
  ...props
}: AuthModeType & {
  fileId: string;
}): Promise<
  AuthResponseType & {
    file: DatasetFileSchema;
  }
> {
  const { userId, teamId, tmbId } = await parseHeaderCert(props);

  const [file, collection] = await Promise.all([
    getFileById({ bucketName: BucketNameEnum.template, fileId }),
    MongoTemplateCollection.findOne({
      teamId,
      fileId
    })
  ]);
  if (!file) {
    return Promise.reject(CommonErrEnum.fileNotFound);
  }

  return {
    userId,
    teamId,
    tmbId,
    file,
    isOwner: true,
    canWrite: true
  };
}
