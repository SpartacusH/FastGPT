import type { moduleDispatchResType } from '@fastgpt/global/core/chat/type.d';
import { formatModelPrice2Store } from '@/service/support/wallet/bill/utils';
// @ts-ignore
import type { SelectedTemplateType } from '@fastgpt/global/core/module/api.d';
import type { SearchDataResponseItemType } from '@fastgpt/global/core/template/type';
import type { ModuleDispatchProps } from '@fastgpt/global/core/module/type.d';
import { ModelTypeEnum, getLLMModel, getVectorModel } from '@/service/core/ai/model';
import { searchTemplateData } from '@/service/core/template/data/controller';
import { ModuleInputKeyEnum, ModuleOutputKeyEnum } from '@fastgpt/global/core/module/constants';
import { TemplateSearchModeEnum } from '@fastgpt/global/core/template/constants';
import { queryExtension } from '@fastgpt/service/core/ai/functions/queryExtension';
import { getHistories } from '../utils';
import { templateSearchQueryExtension } from '@fastgpt/service/core/template/search/utils';
// @ts-ignore
type TemplateSearchProps = ModuleDispatchProps<{
  // @ts-ignore
  [ModuleInputKeyEnum.templateSelectList]: SelectedTemplateType;
  // @ts-ignore
  [ModuleInputKeyEnum.templateSimilarity]: number;
  // @ts-ignore
  [ModuleInputKeyEnum.templateMaxTokens]: number;
  // @ts-ignore
  [ModuleInputKeyEnum.templateSearchMode]: `${TemplateSearchModeEnum}`;
  [ModuleInputKeyEnum.userChatInput]: string;
  // @ts-ignore
  [ModuleInputKeyEnum.templateSearchUsingReRank]: boolean;
  // @ts-ignore
  [ModuleInputKeyEnum.templateSearchUsingExtensionQuery]: boolean;
  // @ts-ignore
  [ModuleInputKeyEnum.templateSearchExtensionModel]: string;
  // @ts-ignore
  [ModuleInputKeyEnum.templateSearchExtensionBg]: string;
}>;
export type TemplateSearchResponse = {
  [ModuleOutputKeyEnum.responseData]: moduleDispatchResType;
  // @ts-ignore
  [ModuleOutputKeyEnum.templateIsEmpty]?: boolean;
  // @ts-ignore
  [ModuleOutputKeyEnum.templateUnEmpty]?: boolean;
  // @ts-ignore
  [ModuleOutputKeyEnum.templateQuoteQA]: SearchDataResponseItemType[];
};

export async function dispatchTemplateSearch(
  props: TemplateSearchProps
): Promise<TemplateSearchResponse> {
  const {
    teamId,
    histories,
    params: {
      // @ts-ignore
      templates = [],
      // @ts-ignore
      similarity,
      // @ts-ignore
      limit = 1500,
      // @ts-ignore
      usingReRank,
      // @ts-ignore
      searchMode,
      userChatInput,
      // @ts-ignore
      templateSearchUsingExtensionQuery,
      // @ts-ignore
      templateSearchExtensionModel,
      // @ts-ignore
      templateSearchExtensionBg
    }
  } = props as TemplateSearchProps;

  if (!Array.isArray(templates)) {
    return Promise.reject('Quote type error');
  }

  if (templates.length === 0) {
    return Promise.reject('core.chat.error.Select template empty');
  }

  if (!userChatInput) {
    return Promise.reject('core.chat.error.User input empty');
  }

  // query extension
  const extensionModel =
    templateSearchUsingExtensionQuery && templateSearchExtensionModel
      ? getLLMModel(templateSearchExtensionModel)
      : undefined;
  const { concatQueries, rewriteQuery, aiExtensionResult } = await templateSearchQueryExtension({
    query: userChatInput,
    extensionModel,
    extensionBg: templateSearchExtensionBg,
    histories: getHistories(6, histories)
  });

  // get vector
  const vectorModel = getVectorModel(templates[0]?.vectorModel?.model);

  // start search
  const {
    searchRes,
    charsLength,
    usingSimilarityFilter,
    usingReRank: searchUsingReRank
  } = await searchTemplateData({
    teamId,
    reRankQuery: `${rewriteQuery}`,
    queries: concatQueries,
    model: vectorModel.model,
    similarity,
    limit,
    templateIds: templates.map((item) => item.templateId),
    searchMode,
    usingReRank
  });

  // count bill results
  // vector
  const { total, modelName } = formatModelPrice2Store({
    model: vectorModel.model,
    inputLen: charsLength,
    type: ModelTypeEnum.vector
  });
  const responseData: moduleDispatchResType & { price: number } = {
    price: total,
    query: concatQueries.join('\n'),
    model: modelName,
    charsLength,
    similarity: usingSimilarityFilter ? similarity : undefined,
    limit,
    searchMode,
    searchUsingReRank: searchUsingReRank
  };

  if (aiExtensionResult) {
    const { total, modelName } = formatModelPrice2Store({
      model: aiExtensionResult.model,
      inputLen: aiExtensionResult.inputTokens,
      outputLen: aiExtensionResult.outputTokens,
      type: ModelTypeEnum.llm
    });

    responseData.price += total;
    responseData.inputTokens = aiExtensionResult.inputTokens;
    responseData.outputTokens = aiExtensionResult.outputTokens;
    responseData.extensionModel = modelName;
    responseData.extensionResult =
      aiExtensionResult.extensionQueries?.join('\n') ||
      JSON.stringify(aiExtensionResult.extensionQueries);
  }

  return {
    // @ts-ignore
    isEmpty: searchRes.length === 0 ? true : undefined,
    unEmpty: searchRes.length > 0 ? true : undefined,
    quoteQA: searchRes,
    responseData
  };
}
