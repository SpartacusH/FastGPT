import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { withNextCors } from '@fastgpt/service/common/middle/cors';
import type { SearchTestProps, SearchTestResponse } from '@/global/core/template/api.d';
import { connectToDatabase } from '@/service/mongo';
import { authTemplate } from '@fastgpt/service/support/permission/auth/template';
import { authTeamBalance } from '@/service/support/permission/auth/bill';
import { pushGenerateVectorBill } from '@/service/support/wallet/bill/push';
import { searchTemplateData } from '@/service/core/template/data/controller';
import { updateApiKeyUsage } from '@fastgpt/service/support/openapi/tools';
import { BillSourceEnum } from '@fastgpt/global/support/wallet/bill/constants';
import { getLLMModel } from '@/service/core/ai/model';
import { queryExtension } from '@fastgpt/service/core/ai/functions/queryExtension';
import { templateSearchQueryExtension } from '@fastgpt/service/core/template/search/utils';

export default withNextCors(async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const {
      templateId,
      text,
      // @ts-ignore
      limit = 1500,
      // @ts-ignore
      similarity,
      // @ts-ignore
      searchMode,
      // @ts-ignore
      usingReRank,
      // @ts-ignore
      templateSearchUsingExtensionQuery = false,
      // @ts-ignore
      templateSearchExtensionModel,
      // @ts-ignore
      templateSearchExtensionBg = ''
    } = req.body as SearchTestProps;

    if (!templateId || !text) {
      throw new Error('缺少参数');
    }
    const start = Date.now();

    // auth template role
    const { template, teamId, tmbId, apikey } = await authTemplate({
      req,
      authToken: true,
      authApiKey: true,
      templateId,
      per: 'r'
    });
    // auth balance
    await authTeamBalance(teamId);

    // query extension
    const extensionModel =
      templateSearchUsingExtensionQuery && templateSearchExtensionModel
        ? getLLMModel(templateSearchExtensionModel)
        : undefined;
    const { concatQueries, rewriteQuery, aiExtensionResult } = await templateSearchQueryExtension({
      query: text,
      extensionModel,
      extensionBg: templateSearchExtensionBg
    });

    const { searchRes, charsLength, ...result } = await searchTemplateData({
      teamId,
      reRankQuery: rewriteQuery,
      queries: concatQueries,
      model: template.vectorModel,
      limit: Math.min(limit, 20000),
      similarity,
      templateIds: [templateId],
      searchMode,
      usingReRank
    });

    // push bill
    const { total } = pushGenerateVectorBill({
      teamId,
      tmbId,
      charsLength,
      model: template.vectorModel,
      source: apikey ? BillSourceEnum.api : BillSourceEnum.fastgpt,

      ...(aiExtensionResult &&
        extensionModel && {
          extensionModel: extensionModel.name,
          extensionInputTokens: aiExtensionResult.inputTokens,
          extensionOutputTokens: aiExtensionResult.outputTokens
        })
    });
    if (apikey) {
      updateApiKeyUsage({
        apikey,
        usage: total
      });
    }

    jsonRes<SearchTestResponse>(res, {
      data: {
        list: searchRes,
        duration: `${((Date.now() - start) / 1000).toFixed(3)}s`,
        usingQueryExtension: !!aiExtensionResult,
        ...result
      }
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
});
