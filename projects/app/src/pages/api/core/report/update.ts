import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoReport } from '@fastgpt/service/core/report/schema';
import type { ReportUpdateParams } from '@fastgpt/global/core/report/api';
import { authReport } from '@fastgpt/service/support/permission/auth/report';
import { FlowNodeTypeEnum } from '@fastgpt/global/core/module/node/constant';
import { ModuleInputKeyEnum } from '@fastgpt/global/core/module/constants';
import { getLLMModel } from '@/service/core/ai/model';

/* 获取我的模型 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    const { name, avatar, type, simpleTemplateId, intro, modules, permission } =
      req.body as ReportUpdateParams;
    const { reportId } = req.query as { reportId: string };

    if (!reportId) {
      throw new Error('reportId is empty');
    }

    // 凭证校验
    await authReport({ req, authToken: true, reportId, per: permission ? 'owner' : 'w' });

    // check modules
    // 1. dataset search limit, less than model quoteMaxToken
    if (modules) {
      let maxTokens = 3000;

      modules.forEach((item) => {
        if (item.flowType === FlowNodeTypeEnum.chatNode) {
          const model =
            item.inputs.find((item) => item.key === ModuleInputKeyEnum.aiModel)?.value || '';
          const chatModel = getLLMModel(model);
          const quoteMaxToken = chatModel.quoteMaxToken || 3000;

          maxTokens = Math.max(maxTokens, quoteMaxToken);
        }
      });

      modules.forEach((item) => {
        if (item.flowType === FlowNodeTypeEnum.datasetSearchNode) {
          item.inputs.forEach((input) => {
            if (input.key === ModuleInputKeyEnum.datasetMaxTokens) {
              const val = input.value as number;
              if (val > maxTokens) {
                input.value = maxTokens;
              }
            }
          });
        }
      });
    }

    // 更新模型
    await MongoReport.updateOne(
      {
        _id: reportId
      },
      {
        name,
        type,
        simpleTemplateId,
        avatar,
        intro,
        permission,
        ...(modules && {
          modules
        })
      }
    );

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
