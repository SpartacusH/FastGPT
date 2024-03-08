import type { LLMModelItemType } from '../ai/model.d';
import { ReportTypeEnum } from './constants';
import { ReportSchema, ReportSimpleEditFormType } from './type';

export type CreateReportParams = {
  name?: string;
  avatar?: string;
  simpleTemplateId?: string;
  modules: ReportSchema['modules'];
};

export interface ReportUpdateParams {
  name?: string;
  type?: `${ReportTypeEnum}`;
  simpleTemplateId?: string;
  avatar?: string;
  intro?: string;
  modules?: ReportSchema['modules'];
  permission?: ReportSchema['permission'];
}

export type FormatForm2ModulesProps = {
  formData: ReportSimpleEditFormType;
  chatModelMaxToken: number;
  llmModelList: LLMModelItemType[];
};
