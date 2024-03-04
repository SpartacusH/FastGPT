import type { LLMModelItemType, VectorModelItemType } from '../../core/ai/model.d';
import { PermissionTypeEnum } from '../../support/permission/constant';
import { PushTemplateDataChunkProps } from './api';
import {
  TemplateCollectionTypeEnum,
  TemplateDataIndexTypeEnum,
  TemplateStatusEnum,
  TemplateTypeEnum,
  SearchScoreTypeEnum,
  TrainingModeEnum
} from './constants';

/* schema */
export type TemplateSchemaType = {
  _id: string;
  parentId: string;
  userId: string;
  teamId: string;
  tmbId: string;
  updateTime: Date;
  avatar: string;
  name: string;
  vectorModel: string;
  agentModel: string;
  intro: string;
  type: `${TemplateTypeEnum}`;
  status: `${TemplateStatusEnum}`;
  permission: `${PermissionTypeEnum}`;
  websiteConfig?: {
    url: string;
    selector: string;
  };
};

export type TemplateCollectionSchemaType = {
  _id: string;
  teamId: string;
  tmbId: string;
  templateId: string;
  parentId?: string;
  name: string;
  type: `${TemplateCollectionTypeEnum}`;
  createTime: Date;
  updateTime: Date;

  trainingType: `${TrainingModeEnum}`;
  chunkSize: number;
  chunkSplitter?: string;
  qaPrompt?: string;

  fileId?: string;
  rawLink?: string;

  rawTextLength?: number;
  hashRawText?: string;
  metadata?: {
    webPageSelector?: string;
    relatedImgId?: string; // The id of the associated image collections

    [key: string]: any;
  };
};

export type TemplateDataIndexItemType = {
  defaultIndex: boolean;
  dataId: string; // pg data id
  type: `${TemplateDataIndexTypeEnum}`;
  text: string;
};
export type TemplateDataSchemaType = {
  _id: string;
  userId: string;
  teamId: string;
  tmbId: string;
  templateId: string;
  collectionId: string;
  templateId: string;
  collectionId: string;
  chunkIndex: number;
  updateTime: Date;
  q: string; // large chunks or question
  a: string; // answer or custom content
  fullTextToken: string;
  indexes: TemplateDataIndexItemType[];
};

export type TemplateTrainingSchemaType = {
  _id: string;
  userId: string;
  teamId: string;
  tmbId: string;
  templateId: string;
  collectionId: string;
  billId: string;
  expireAt: Date;
  lockTime: Date;
  mode: `${TrainingModeEnum}`;
  model: string;
  prompt: string;
  q: string;
  a: string;
  chunkIndex: number;
  weight: number;
  indexes: Omit<TemplateDataIndexItemType, 'dataId'>[];
};

export type CollectionWithTemplateType = Omit<TemplateCollectionSchemaType, 'templateId'> & {
  templateId: TemplateSchemaType;
};
export type TemplateDataWithCollectionType = Omit<TemplateDataSchemaType, 'collectionId'> & {
  collectionId: TemplateCollectionSchemaType;
};

/* ================= template ===================== */
export type TemplateListItemType = {
  _id: string;
  parentId: string;
  avatar: string;
  name: string;
  intro: string;
  type: `${TemplateTypeEnum}`;
  isOwner: boolean;
  canWrite: boolean;
  permission: `${PermissionTypeEnum}`;
  vectorModel: VectorModelItemType;
};
export type TemplateItemType = Omit<TemplateSchemaType, 'vectorModel' | 'agentModel'> & {
  vectorModel: VectorModelItemType;
  agentModel: LLMModelItemType;
  isOwner: boolean;
  canWrite: boolean;
};

/* ================= collection ===================== */
export type TemplateCollectionItemType = CollectionWithTemplateType & {
  canWrite: boolean;
  sourceName: string;
  sourceId?: string;
  file?: TemplateFileSchema;
};

/* ================= data ===================== */
export type TemplateDataItemType = {
  id: string;
  templateId: string;
  collectionId: string;
  sourceName: string;
  sourceId?: string;
  q: string;
  a: string;
  chunkIndex: number;
  indexes: TemplateDataIndexItemType[];
  isOwner: boolean;
  canWrite: boolean;
};

/* --------------- file ---------------------- */
export type TemplateFileSchema = {
  _id: string;
  length: number;
  chunkSize: number;
  uploadDate: Date;
  filename: string;
  contentType: string;
  metadata: {
    contentType: string;
    templateId: string;
    teamId: string;
    tmbId: string;
  };
};

/* ============= search =============== */
export type SearchDataResponseItemType = Omit<
  TemplateDataItemType,
  'indexes' | 'isOwner' | 'canWrite'
> & {
  score: { type: `${SearchScoreTypeEnum}`; value: number; index: number }[];
  // score: number;
};
