import type { ReportTTSConfigType, ModuleItemType, VariableItemType } from '../module/type.d';
import { ReportTypeEnum } from './constants';
import { PermissionTypeEnum } from '../../support/permission/constant';
import type { AIChatModuleProps, DatasetModuleProps } from '../module/node/type.d';
import { VariableInputEnum } from '../module/constants';
import { SelectedDatasetType } from '../module/api';
import { DatasetSearchModeEnum } from '../dataset/constants';

export interface ReportSchema {
  _id: string;
  userId: string;
  teamId: string;
  tmbId: string;
  name: string;
  type: `${ReportTypeEnum}`;
  simpleTemplateId: string;
  avatar: string;
  intro: string;
  updateTime: number;
  modules: ModuleItemType[];
  permission: `${PermissionTypeEnum}`;
  inited?: boolean;
}

export type ReportListItemType = {
  _id: string;
  simpleTemplateId: string;
  name: string;
  avatar: string;
  intro: string;
  isOwner: boolean;
  permission: `${PermissionTypeEnum}`;
};

export type ReportDetailType = ReportSchema & {
  isOwner: boolean;
  canWrite: boolean;
};

// export type ReportSimpleEditFormType = {
//   aiSettings: AIChatModuleProps;
//   dataset: DatasetModuleProps & {
//     searchEmptyText: string;
//   };
//   userGuide: {
//     welcomeText: string;
//     variables: VariableItemType[];
//     questionGuide: boolean;
//     tts: ReportTTSConfigType;
//   };
// };
// Since useform cannot infer enumeration types, all enumeration keys can only be undone manually
export type ReportSimpleEditFormType = {
  // templateId: string;
  aiSettings: {
    model: string;
    systemPrompt?: string | undefined;
    temperature: number;
    maxToken: number;
    isResponseAnswerText: boolean;
    quoteTemplate?: string | undefined;
    quotePrompt?: string | undefined;
  };
  dataset: {
    datasets: SelectedDatasetType;
    searchMode: `${DatasetSearchModeEnum}`;
    similarity?: number;
    limit?: number;
    usingReRank?: boolean;
    searchEmptyText?: string;
    datasetSearchUsingExtensionQuery?: boolean;
    datasetSearchExtensionModel?: string;
    datasetSearchExtensionBg?: string;
  };
  userGuide: {
    welcomeText: string;
    variables: {
      id: string;
      key: string;
      label: string;
      type: `${VariableInputEnum}`;
      required: boolean;
      maxLen: number;
      enums: {
        value: string;
      }[];
    }[];
    questionGuide: boolean;
    tts: {
      type: 'none' | 'web' | 'model';
      model?: string | undefined;
      voice?: string | undefined;
      speed?: number | undefined;
    };
  };
};

/* simple mode template*/
export type ReportSimpleEditConfigTemplateType = {
  id: string;
  name: string;
  desc: string;
  systemForm: {
    aiSettings?: {
      model?: boolean;
      systemPrompt?: boolean;
      temperature?: boolean;
      maxToken?: boolean;
      quoteTemplate?: boolean;
      quotePrompt?: boolean;
    };
    dataset?: {
      datasets?: boolean;
      similarity?: boolean;
      limit?: boolean;
      searchMode: `${DatasetSearchModeEnum}`;
      usingReRank: boolean;
      searchEmptyText?: boolean;
    };
    userGuide?: {
      welcomeText?: boolean;
      variables?: boolean;
      questionGuide?: boolean;
      tts?: boolean;
    };
  };
};
