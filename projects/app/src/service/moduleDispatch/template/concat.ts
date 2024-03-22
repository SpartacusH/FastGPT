import type { SearchDataResponseItemType } from '@fastgpt/global/core/template/type';
import type { ModuleDispatchProps } from '@fastgpt/global/core/module/type.d';
import { ModuleInputKeyEnum, ModuleOutputKeyEnum } from '@fastgpt/global/core/module/constants';
import { templateSearchResultConcat } from '@fastgpt/global/core/template/search/utils';
import { filterSearchResultsByMaxChars } from '@fastgpt/global/core/template/search/utils';

type TemplateConcatProps = ModuleDispatchProps<
  {
    // @ts-ignore
    [ModuleInputKeyEnum.templateMaxTokens]: number;
  } & { [key: string]: SearchDataResponseItemType[] }
>;
type TemplateConcatResponse = {
  // @ts-ignore
  [ModuleOutputKeyEnum.templateQuoteQA]: SearchDataResponseItemType[];
};

export async function dispatchTemplateConcat(
  props: TemplateConcatProps
): Promise<TemplateConcatResponse> {
  const {
    params: { limit = 1500, ...quoteMap }
  } = props as TemplateConcatProps;

  const quoteList = Object.values(quoteMap).filter((list) => Array.isArray(list));

  const rrfConcatResults = templateSearchResultConcat(
    quoteList.map((list) => ({
      k: 60,
      list
    }))
  );

  return {
    // @ts-ignore
    [ModuleOutputKeyEnum.templateQuoteQA]: filterSearchResultsByMaxChars(rrfConcatResults, limit)
  };
}
