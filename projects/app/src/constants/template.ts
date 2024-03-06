import { defaultQAModels, defaultVectorModels } from '@fastgpt/global/core/ai/model';
import type {
  TemplateCollectionItemType,
  TemplateItemType
} from '@fastgpt/global/core/template/type.d';

export const defaultTemplateDetail: TemplateItemType = {
  _id: '',
  parentId: '',
  userId: '',
  teamId: '',
  tmbId: '',
  updateTime: new Date(),
  type: 'template',
  avatar: '/icon/logo.svg',
  name: '',
  fileName:'',
  fileId:'',
  intro: '',
  status: 'active',
  permission: 'private',
  isOwner: false,
  canWrite: false,
};

export const defaultCollectionDetail: TemplateCollectionItemType = {
  _id: '',
  teamId: '',
  tmbId: '',
  templateId: {
    _id: '',
    parentId: '',
    userId: '',
    teamId: '',
    tmbId: '',
    updateTime: new Date(),
    type: 'template',
    avatar: '/icon/logo.svg',
    name: '',
    intro: '',
    status: 'active',
    permission: 'private',
    vectorModel: defaultVectorModels[0].model,
    agentModel: defaultQAModels[0].model
  },
  parentId: '',
  name: '',
  type: 'file',
  updateTime: new Date(),
  canWrite: false,
  sourceName: '',
  sourceId: '',
  createTime: new Date(),
  trainingType: 'chunk',
  chunkSize: 0
};
