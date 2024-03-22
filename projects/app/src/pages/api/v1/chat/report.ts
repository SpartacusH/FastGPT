import type { NextApiRequest, NextApiResponse } from 'next';
import { authReport } from '@fastgpt/service/support/permission/auth/report';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { sseErrRes, jsonRes } from '@fastgpt/service/common/response';
import { addLog } from '@fastgpt/service/common/system/log';
import { withNextCors } from '@fastgpt/service/common/middle/cors';
import { ChatRoleEnum, ChatSourceEnum } from '@fastgpt/global/core/chat/constants';
import { sseResponseEventEnum } from '@fastgpt/service/common/response/constant';
import { dispatchModules } from '@/service/moduleDispatch';
import type { ChatCompletionCreateParams } from '@fastgpt/global/core/ai/type.d';
import type { ChatMessageItemType } from '@fastgpt/global/core/ai/type.d';
import { gptMessage2ChatType, textAdaptGptResponse } from '@/utils/adapt';
import { getChatItems } from '@fastgpt/service/core/chat/controller';
import { saveChat } from '@/service/utils/chat/saveChat';
import { responseWrite } from '@fastgpt/service/common/response';
import { pushChatBill } from '@/service/support/wallet/bill/push';
import { authOutLinkChatStart } from '@/service/support/permission/auth/outLink';
import { pushResult2Remote, updateOutLinkUsage } from '@fastgpt/service/support/outLink/tools';
import requestIp from 'request-ip';
import { getBillSourceByAuthType } from '@fastgpt/global/support/wallet/bill/tools';

import { selectShareResponse } from '@/utils/service/core/chat';
import { updateApiKeyUsage } from '@fastgpt/service/support/openapi/tools';
import { connectToDatabase } from '@/service/mongo';
import { getUserAndAuthBalance } from '@fastgpt/service/support/user/controller';
import { AuthUserTypeEnum } from '@fastgpt/global/support/permission/constant';
import { MongoReport } from '@fastgpt/service/core/report/schema';
import { autChatCrud } from '@/service/support/permission/auth/chat';

type FastGptWebChatProps = {
  chatId?: string; // undefined: nonuse history, '': new chat, 'xxxxx': use history
  reportId?: string;
};
type FastGptShareChatProps = {
  shareId?: string;
  outLinkUid?: string;
};
export type Props = ChatCompletionCreateParams &
  FastGptWebChatProps &
  FastGptShareChatProps & {
    messages: ChatMessageItemType[];
    stream?: boolean;
    detail?: boolean;
    variables: Record<string, any>;
  };
export type ChatResponseType = {
  newChatId: string;
  quoteLen?: number;
};

export default withNextCors(async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.on('close', () => {
    res.end();
  });
  res.on('error', () => {
    console.log('error: ', 'request error');
    res.end();
  });

  const {
    chatId,
    reportId,
    shareId,
    outLinkUid,
    stream = false,
    detail = false,
    messages = [],
    variables = {}
  } = req.body as Props;

  try {
    const originIp = requestIp.getClientIp(req);

    await connectToDatabase();
    // body data check
    if (!messages) {
      throw new Error('Prams Error');
    }
    if (!Array.isArray(messages)) {
      throw new Error('messages is not array');
    }
    if (messages.length === 0) {
      throw new Error('messages is empty');
    }

    let startTime = Date.now();

    const chatMessages = gptMessage2ChatType(messages);
    if (chatMessages[chatMessages.length - 1].obj !== ChatRoleEnum.Human) {
      chatMessages.pop();
    }

    // user question
    const question = chatMessages.pop();
    if (!question) {
      throw new Error('Question is empty');
    }

    /* auth report permission */
    const { user, report, responseDetail, authType, apikey, canWrite, uid } = await (async () => {
      if (shareId && outLinkUid) {
        // @ts-ignore
        const { user, reportId, authType, responseDetail, uid } = await authOutLinkChatStart({
          shareId,
          ip: originIp,
          outLinkUid,
          question: question.value
        });
        const report = await MongoReport.findById(reportId);

        if (!report) {
          return Promise.reject('report is empty');
        }

        return {
          user,
          report,
          responseDetail,
          apikey: '',
          authType,
          canWrite: false,
          uid
        };
      }

      const {
        // @ts-ignore
        reportId: apiKeyReportId,
        tmbId,
        authType,
        apikey
      } = await authCert({
        req,
        authToken: true,
        authApiKey: true
      });

      const user = await getUserAndAuthBalance({
        tmbId,
        minBalance: 0
      });

      // openapi key
      if (authType === AuthUserTypeEnum.apikey) {
        if (!apiKeyReportId) {
          return Promise.reject(
            'Key is error. You need to use the report key rather than the account key.'
          );
        }
        const report = await MongoReport.findById(apiKeyReportId);

        if (!report) {
          return Promise.reject('report is empty');
        }

        return {
          user,
          report,
          responseDetail: detail,
          apikey,
          authType,
          canWrite: true
        };
      }

      // token auth
      if (!reportId) {
        return Promise.reject('reportId is empty');
      }
      const { report, canWrite } = await authReport({
        req,
        authToken: true,
        reportId,
        per: 'r'
      });

      return {
        user,
        report,
        responseDetail: detail,
        apikey,
        authType,
        canWrite: canWrite || false
      };
    })();

    // auth chat permission
    await autChatCrud({
      req,
      authToken: true,
      authApiKey: true,
      // @ts-ignore
      reportId: report._id,
      chatId,
      shareId,
      outLinkUid,
      per: 'w'
    });

    // get and concat history
    const { history } = await getChatItems({
      // @ts-ignore
      reportId: report._id,
      chatId,
      limit: 30,
      field: `dataId obj value`
    });
    const concatHistories = history.concat(chatMessages);
    const responseChatItemId: string | undefined = messages[messages.length - 1].dataId;

    /* start flow controller */
    const { responseData, answerText } = await dispatchModules({
      res,
      mode: 'chat',
      user,
      teamId: String(user.team.teamId),
      tmbId: String(user.team.tmbId),
      // @ts-ignore
      reportId: String(report._id),
      chatId,
      responseChatItemId,
      modules: report.modules,
      variables,
      histories: concatHistories,
      startParams: {
        userChatInput: question.value
      },
      stream,
      detail
    });

    // save chat
    if (chatId) {
      await saveChat({
        chatId,
        // @ts-ignore
        reportId: report._id,
        teamId: user.team.teamId,
        tmbId: user.team.tmbId,
        variables,
        updateUseTime: !shareId && String(user.team.tmbId) === String(report.tmbId), // owner update use time
        shareId,
        outLinkUid: uid,
        source: (() => {
          if (shareId) {
            return ChatSourceEnum.share;
          }
          if (authType === 'apikey') {
            return ChatSourceEnum.api;
          }
          return ChatSourceEnum.online;
        })(),
        content: [
          question,
          {
            dataId: responseChatItemId,
            obj: ChatRoleEnum.AI,
            value: answerText,
            responseData
          }
        ],
        metadata: {
          originIp
        }
      });
    }

    addLog.info(`completions running time: ${(Date.now() - startTime) / 1000}s`);

    /* select fe response field */
    const feResponseData = canWrite ? responseData : selectShareResponse({ responseData });

    if (stream) {
      responseWrite({
        res,
        event: detail ? sseResponseEventEnum.answer : undefined,
        data: textAdaptGptResponse({
          text: null,
          finish_reason: 'stop'
        })
      });
      responseWrite({
        res,
        event: detail ? sseResponseEventEnum.answer : undefined,
        data: '[DONE]'
      });

      if (responseDetail && detail) {
        responseWrite({
          res,
          event: sseResponseEventEnum.reportStreamResponse,
          data: JSON.stringify(feResponseData)
        });
      }

      res.end();
    } else {
      res.json({
        ...(detail ? { responseData: feResponseData } : {}),
        id: chatId || '',
        model: '',
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 1 },
        choices: [
          {
            message: { role: 'assistant', content: answerText },
            finish_reason: 'stop',
            index: 0
          }
        ]
      });
    }

    // add record
    const { total } = pushChatBill({
      // @ts-ignore
      reportName: report.name,
      reportId: report._id,
      teamId: user.team.teamId,
      tmbId: user.team.tmbId,
      source: getBillSourceByAuthType({ shareId, authType }),
      response: responseData
    });

    if (shareId) {
      // @ts-ignore
      pushResult2Remote({ outLinkUid, shareId, responseData });
      // @ts-ignore
      updateOutLinkUsage({
        shareId,
        total
      });
    }
    if (apikey) {
      updateApiKeyUsage({
        apikey,
        usage: total
      });
    }
  } catch (err: any) {
    if (stream) {
      sseErrRes(res, err);
      res.end();
    } else {
      jsonRes(res, {
        code: 500,
        error: err
      });
    }
  }
});

export const config = {
  api: {
    responseLimit: '20mb'
  }
};
