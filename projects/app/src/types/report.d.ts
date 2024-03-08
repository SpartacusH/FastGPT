import { FlowNodeTypeEnum } from '@fastgpt/global/core/module/node/constant';
import { ModuleIOValueTypeEnum } from '@fastgpt/global/core/module/constants';
import { XYPosition } from 'reactflow';
import { ReportModuleItemTypeEnum, ModulesInputItemTypeEnum } from '../constants/report';
import { ReportTypeEnum } from '@fastgpt/global/core/report/constants';
import type {
  FlowNodeInputItemType,
  FlowNodeOutputItemType,
  FlowNodeOutputTargetItemType
} from '@fastgpt/global/core/module/node/type.d';
import type { FlowModuleTemplateType, ModuleItemType } from '@fastgpt/global/core/module/type.d';
import type { ChatSchema } from '@fastgpt/global/core/chat/type';
import type { ReportSchema } from '@fastgpt/global/core/report/type';
import { ChatModelType } from '@/constants/model';

export interface ShareReportItem {
  _id: string;
  avatar: string;
  name: string;
  intro: string;
  userId: string;
  share: ReportSchema['share'];
  isCollection: boolean;
}

/* report module */
export type ReportItemType = {
  id: string;
  name: string;
  modules: ModuleItemType[];
};

export type ReportLogsListItemType = {
  _id: string;
  id: string;
  source: ChatSchema['source'];
  time: Date;
  title: string;
  messageCount: number;
  userGoodFeedbackCount: number;
  userBadFeedbackCount: number;
  customFeedbacksCount: number;
  markCount: number;
};
