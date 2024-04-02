import type { ReportSimpleEditFormType } from '../report/type';
import { FlowNodeTypeEnum } from '../module/node/constant';
import { ModuleOutputKeyEnum, ModuleInputKeyEnum } from '../module/constants';
import type { FlowNodeInputItemType } from '../module/node/type.d';
import { getGuideModule, splitGuideModule } from '../module/utils';
import { ModuleItemType } from '../module/type.d';
import { DatasetSearchModeEnum } from '../dataset/constants';

export const getDefaultReportForm = (): ReportSimpleEditFormType => {
  return {
    aiSettings: {
      model: 'gpt-3.5-turbo',
      systemPrompt: '',
      temperature: 0,
      isResponseAnswerText: true,
      quotePrompt: '',
      quoteTemplate: '',
      maxToken: 4000
    },
    dataset: {
      datasets: [],
      similarity: 0.4,
      limit: 1500,
      searchEmptyText: '',
      searchMode: DatasetSearchModeEnum.mixedRecall,
      usingReRank: false,
      datasetSearchUsingExtensionQuery: true,
      datasetSearchExtensionBg: ''
    },
    userGuide: {
      welcomeText: '',
      variables: [],
      questionGuide: false,
      tts: {
        type: 'web'
      }
    }
  };
};

/* format report modules to edit form */
export const reportModules2Form = ({ modules }: { modules: ModuleItemType[] }) => {
  const defaultReportForm = getDefaultReportForm();

  const findInputValueByKey = (inputs: FlowNodeInputItemType[], key: string) => {
    return inputs.find((item) => item.key === key)?.value;
  };

  modules.forEach((module) => {
    if (module.flowType === FlowNodeTypeEnum.chatNode) {
      defaultReportForm.aiSettings.model = findInputValueByKey(
        module.inputs,
        ModuleInputKeyEnum.aiModel
      );
      defaultReportForm.aiSettings.systemPrompt = findInputValueByKey(
        module.inputs,
        ModuleInputKeyEnum.aiSystemPrompt
      );
      defaultReportForm.aiSettings.temperature = findInputValueByKey(
        module.inputs,
        ModuleInputKeyEnum.aiChatTemperature
      );
      defaultReportForm.aiSettings.maxToken = findInputValueByKey(
        module.inputs,
        ModuleInputKeyEnum.aiChatMaxToken
      );
      defaultReportForm.aiSettings.quoteTemplate = findInputValueByKey(
        module.inputs,
        ModuleInputKeyEnum.aiChatQuoteTemplate
      );
      defaultReportForm.aiSettings.quotePrompt = findInputValueByKey(
        module.inputs,
        ModuleInputKeyEnum.aiChatQuotePrompt
      );
    } else if (module.flowType === FlowNodeTypeEnum.datasetSearchNode) {
      defaultReportForm.dataset.datasets = findInputValueByKey(
        module.inputs,
        ModuleInputKeyEnum.datasetSelectList
      );
      defaultReportForm.dataset.similarity = findInputValueByKey(
        module.inputs,
        ModuleInputKeyEnum.datasetSimilarity
      );
      defaultReportForm.dataset.limit = findInputValueByKey(
        module.inputs,
        ModuleInputKeyEnum.datasetMaxTokens
      );
      defaultReportForm.dataset.searchMode =
        findInputValueByKey(module.inputs, ModuleInputKeyEnum.datasetSearchMode) ||
        DatasetSearchModeEnum.mixedRecall;
      defaultReportForm.dataset.usingReRank = !!findInputValueByKey(
        module.inputs,
        ModuleInputKeyEnum.datasetSearchUsingReRank
      );
      defaultReportForm.dataset.datasetSearchUsingExtensionQuery = findInputValueByKey(
        module.inputs,
        ModuleInputKeyEnum.datasetSearchUsingExtensionQuery
      );
      defaultReportForm.dataset.datasetSearchExtensionModel = findInputValueByKey(
        module.inputs,
        ModuleInputKeyEnum.datasetSearchExtensionModel
      );
      defaultReportForm.dataset.datasetSearchExtensionBg = findInputValueByKey(
        module.inputs,
        ModuleInputKeyEnum.datasetSearchExtensionBg
      );

      // empty text
      const emptyOutputs =
        module.outputs.find((item) => item.key === ModuleOutputKeyEnum.datasetIsEmpty)?.targets ||
        [];
      const emptyOutput = emptyOutputs[0];
      if (emptyOutput) {
        const target = modules.find((item) => item.moduleId === emptyOutput.moduleId);
        defaultReportForm.dataset.searchEmptyText =
          target?.inputs?.find((item) => item.key === ModuleInputKeyEnum.answerText)?.value || '';
      }
    } else if (module.flowType === FlowNodeTypeEnum.userGuide) {
      const { welcomeText, variableModules, questionGuide, ttsConfig } = splitGuideModule(
        getGuideModule(modules)
      );
      defaultReportForm.userGuide = {
        welcomeText: welcomeText,
        variables: variableModules,
        questionGuide: questionGuide,
        tts: ttsConfig
      };
    }
  });

  return defaultReportForm;
};
