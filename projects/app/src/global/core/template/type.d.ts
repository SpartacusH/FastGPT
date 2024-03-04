import { ParentTreePathItemType } from '@fastgpt/global/common/parentFolder/type';
import {
  TemplateCollectionSchemaType,
  TemplateDataSchemaType
} from '@fastgpt/global/core/template/type.d';

/* ================= template ===================== */

/* ================= collection ===================== */
export type TemplateCollectionsListItemType = {
  _id: string;
  parentId?: string;
  tmbId: string;
  name: string;
  type: TemplateCollectionSchemaType['type'];
  updateTime: Date;
  createTime: Date;
  dataAmount: number;
  trainingAmount: number;
  intro?:string;
  fileId?: string;
  rawLink?: string;
  canWrite: boolean;
};

/* ================= data ===================== */
export type TemplateDataListItemType = {
  _id: string;
  templateId: string;
  collectionId: string;
  q: string; // embedding content
  a: string; // bonus content
  chunkIndex?: number;
  indexes: TemplateDataSchemaType['indexes'];
};
