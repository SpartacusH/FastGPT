import { TemplateDataIndexItemType, TemplateSchemaType } from './type';
import { TrainingModeEnum, TemplateCollectionTypeEnum } from './constants';
import type { LLMModelItemType } from '../ai/model.d';

/* ================= template ===================== */
export type TemplateUpdateBody = {
  id: string;
  parentId?: string;
  name?: string;
  avatar?: string;
  intro?: string;
  permission?: TemplateSchemaType['permission'];
  agentModel?: LLMModelItemType;
  websiteConfig?: TemplateSchemaType['websiteConfig'];
  status?: TemplateSchemaType['status'];
};

/* ================= collection ===================== */
export type TemplateCollectionChunkMetadataType = {
  parentId?: string;
  trainingType?: `${TrainingModeEnum}`;
  chunkSize?: number;
  chunkSplitter?: string;
  qaPrompt?: string;
  metadata?: Record<string, any>;
};
export type CreateTemplateCollectionParams = TemplateCollectionChunkMetadataType & {
  templateId: string;
  name: string;
  type: `${TemplateCollectionTypeEnum}`;
  fileId?: string;
  rawLink?: string;
  rawTextLength?: number;
  hashRawText?: string;
};

export type ApiCreateTemplateCollectionParams = TemplateCollectionChunkMetadataType & {
  templateId: string;
};
export type TextCreateTemplateCollectionParams = ApiCreateTemplateCollectionParams & {
  name: string;
  text: string;
};
export type LinkCreateTemplateCollectionParams = ApiCreateTemplateCollectionParams & {
  link: string;
};
export type FileCreateTemplateCollectionParams = ApiCreateTemplateCollectionParams & {
  name: string;
  rawTextLength: number;
  hashRawText: string;

  fileMetadata?: Record<string, any>;
  collectionMetadata?: Record<string, any>;
};

/* ================= data ===================== */
export type PgSearchRawType = {
  id: string;
  collection_id: string;
  score: number;
};
export type PushTemplateDataChunkProps = {
  q: string; // embedding content
  a?: string; // bonus content
  chunkIndex?: number;
  indexes?: Omit<TemplateDataIndexItemType, 'dataId'>[];
};

export type PostWebsiteSyncParams = {
  templateId: string;
  billId: string;
};

export type PushTemplateDataProps = {
  collectionId: string;
  data: PushTemplateDataChunkProps[];
  trainingMode: `${TrainingModeEnum}`;
  prompt?: string;
  billId?: string;
};
export type PushTemplateDataResponse = {
  insertLen: number;
};
