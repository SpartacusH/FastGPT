import { ReportSimpleEditConfigTemplateType } from '@fastgpt/global/core/report/type.d';
import { DatasetSearchModeEnum } from '@fastgpt/global/core/dataset/constants';

export const SimpleModeTemplate_Report_Universal: ReportSimpleEditConfigTemplateType = {
  id: 'report-universal',
  name: 'core.report.template.Common template',
  desc: 'core.report.template.Common template tip',
  systemForm: {
    aiSettings: {
      model: true,
      systemPrompt: true,
      temperature: true,
      maxToken: true,
      quoteTemplate: true,
      quotePrompt: true
    },
    dataset: {
      datasets: true,
      similarity: true,
      limit: true,
      searchMode: DatasetSearchModeEnum.embedding,
      usingReRank: true,
      searchEmptyText: true
    },
    userGuide: {
      welcomeText: false,
      variables: true,
      questionGuide: false,
      tts: true
    }
  }
};
