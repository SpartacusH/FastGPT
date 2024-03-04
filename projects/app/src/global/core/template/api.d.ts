import { PushTemplateDataChunkProps } from '@fastgpt/global/core/template/api';
import {
  TemplateSearchModeEnum,
  TemplateTypeEnum,
  TrainingModeEnum
} from '@fastgpt/global/core/template/constants';
import {
  TemplateDataIndexItemType,
  SearchDataResponseItemType
} from '@fastgpt/global/core/template/type';
import { ModuleInputKeyEnum } from '@fastgpt/global/core/module/constants';

/* ================= template ===================== */
export type CreateTemplateParams = {
  parentId?: string;
  type: `${TemplateTypeEnum}`;
  name: string;
  intro: string;
  avatar: string;
  vectorModel?: string;
  agentModel?: string;
  type: `${TemplateTypeEnum}`;
};

/* ================= collection ===================== */

/* ================= data ===================== */
export type InsertOneTemplateDataProps = PushTemplateDataChunkProps & {
  collectionId: string;
};

export type UpdateTemplateDataProps = {
  id: string;
  q?: string; // embedding content
  a?: string; // bonus content
  indexes: (Omit<TemplateDataIndexItemType, 'dataId'> & {
    dataId?: string; // pg data id
  })[];
};

export type GetTrainingQueueProps = {
  vectorModel: string;
  agentModel: string;
};
export type GetTrainingQueueResponse = {
  vectorTrainingCount: number;
  agentTrainingCount: number;
};

/* -------------- search ---------------- */
export type SearchTestProps = {
  templateId: string;
  text: string;
  [ModuleInputKeyEnum.templateSimilarity]?: number;
  [ModuleInputKeyEnum.templateMaxTokens]?: number;
  [ModuleInputKeyEnum.templateSearchMode]?: `${TemplateSearchModeEnum}`;
  [ModuleInputKeyEnum.templateSearchUsingReRank]?: boolean;
  [ModuleInputKeyEnum.templateSearchUsingExtensionQuery]?: boolean;
  [ModuleInputKeyEnum.templateSearchExtensionModel]?: string;
  [ModuleInputKeyEnum.templateSearchExtensionBg]?: string;
};
export type SearchTestResponse = {
  list: SearchDataResponseItemType[];
  duration: string;
  limit: number;
  searchMode: `${TemplateSearchModeEnum}`;
  usingReRank: boolean;
  similarity: number;
  usingQueryExtension: boolean;
};
