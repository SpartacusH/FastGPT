import { ReportSimpleEditConfigTemplateType } from '@fastgpt/global/core/report/type';
import { GET } from '@fastgpt/service/common/api/plusRequest';
import { FastGPTProUrl } from '@fastgpt/service/common/system/constants';

export async function getSimpleTemplatesFromPlus(): Promise<ReportSimpleEditConfigTemplateType[]> {
  try {
    if (!FastGPTProUrl) return [];

    return GET<ReportSimpleEditConfigTemplateType[]>('/core/report/getSimpleTemplates');
  } catch (error) {
    return [];
  }
}
