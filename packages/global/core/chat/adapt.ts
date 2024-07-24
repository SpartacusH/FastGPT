import type { ChatItemType } from '../../core/chat/type.d';
import { ChatFileTypeEnum,ChatItemValueTypeEnum,ChatRoleEnum } from '../../core/chat/constants';
import { ChatCompletionRequestMessageRoleEnum } from '../../core/ai/constant';
// @ts-ignore
import type { ChatMessageItemType,ChatCompletionMessageParam,ChatCompletionMessageToolCall,ChatCompletionMessageFunctionCall,ChatCompletionFunctionMessageParam } from '../../core/ai/type.d';

const chat2Message = {
  [ChatRoleEnum.AI]: ChatCompletionRequestMessageRoleEnum.Assistant,
  [ChatRoleEnum.Human]: ChatCompletionRequestMessageRoleEnum.User,
  [ChatRoleEnum.System]: ChatCompletionRequestMessageRoleEnum.System,
  [ChatRoleEnum.Function]: ChatCompletionRequestMessageRoleEnum.Function,
  [ChatRoleEnum.Tool]: ChatCompletionRequestMessageRoleEnum.Tool
};
const message2Chat = {
  [ChatCompletionRequestMessageRoleEnum.System]: ChatRoleEnum.System,
  [ChatCompletionRequestMessageRoleEnum.User]: ChatRoleEnum.Human,
  [ChatCompletionRequestMessageRoleEnum.Assistant]: ChatRoleEnum.AI,
  [ChatCompletionRequestMessageRoleEnum.Function]: ChatRoleEnum.Function,
  [ChatCompletionRequestMessageRoleEnum.Tool]: ChatRoleEnum.Tool
};
const GPT2Chat = {
  [ChatCompletionRequestMessageRoleEnum.System]: ChatRoleEnum.System,
  [ChatCompletionRequestMessageRoleEnum.User]: ChatRoleEnum.Human,
  [ChatCompletionRequestMessageRoleEnum.Assistant]: ChatRoleEnum.AI,
  [ChatCompletionRequestMessageRoleEnum.Function]: ChatRoleEnum.AI,
  [ChatCompletionRequestMessageRoleEnum.Tool]: ChatRoleEnum.AI
};
export function adaptRole_Chat2Message(role: `${ChatRoleEnum}`) {
  return chat2Message[role];
}
export function adaptRole_Message2Chat(role: `${ChatCompletionRequestMessageRoleEnum}`) {
  return message2Chat[role];
}

export const adaptChat2GptMessages = ({
  messages,
  reserveId
}: {
  messages: ChatItemType[];
  reserveId: boolean;
}): ChatMessageItemType[] => {
  return messages.map((item) => ({
    ...(reserveId && { dataId: item.dataId }),
    role: chat2Message[item.obj],
    content: item.value || ''
  }));
};

export const GPTMessages2Chats = (
  messages: ChatCompletionMessageParam[],
  reserveTool = true
): ChatItemType[] => {
  return messages
    .map((item) => {
      const value: ChatItemType['value'] = [];
      const obj = GPT2Chat[item.role];

      if (
        obj === ChatRoleEnum.System &&
        item.role === ChatCompletionRequestMessageRoleEnum.System
      ) {
        value.push({
          type: ChatItemValueTypeEnum.text,
          text: {
            content: item.content
          }
        });
      } else if (
        obj === ChatRoleEnum.Human &&
        item.role === ChatCompletionRequestMessageRoleEnum.User
      ) {
        if (typeof item.content === 'string') {
          value.push({
            type: ChatItemValueTypeEnum.text,
            text: {
              content: item.content
            }
          });
        } else if (Array.isArray(item.content)) {
          item.content.forEach((item) => {
            if (item.type === 'text') {
              value.push({
                type: ChatItemValueTypeEnum.text,
                text: {
                  content: item.text
                }
              });
            } else if (item.type === 'image_url') {
              value.push({
                //@ts-ignore
                type: 'file',
                file: {
                  type: ChatFileTypeEnum.image,
                  name: '',
                  url: item.image_url.url
                }
              });
            }
          });
          // @ts-ignore
        }
      } else if (
        obj === ChatRoleEnum.AI &&
        item.role === ChatCompletionRequestMessageRoleEnum.Assistant
      ) {
        if (item.content && typeof item.content === 'string') {
          value.push({
            type: ChatItemValueTypeEnum.text,
            text: {
              content: item.content
            }
          });
        } else if (item.tool_calls && reserveTool) {
          // save tool calls
          const toolCalls = item.tool_calls as ChatCompletionMessageToolCall[];
          value.push({
            //@ts-ignore
            type: ChatItemValueTypeEnum.tool,
            tools: toolCalls.map((tool) => {
              let toolResponse =
                messages.find(
                  (msg) =>
                    msg.role === ChatCompletionRequestMessageRoleEnum.Tool &&
                    msg.tool_call_id === tool.id
                )?.content || '';
              toolResponse =
                typeof toolResponse === 'string' ? toolResponse : JSON.stringify(toolResponse);

              return {
                id: tool.id,
                toolName: tool.toolName || '',
                toolAvatar: tool.toolAvatar || '',
                functionName: tool.function.name,
                params: tool.function.arguments,
                response: toolResponse as string
              };
            })
          });
        } else if (item.function_call && reserveTool) {
          const functionCall = item.function_call as ChatCompletionMessageFunctionCall;
          const functionResponse = messages.find(
            (msg) =>
              msg.role === ChatCompletionRequestMessageRoleEnum.Function &&
              msg.name === item.function_call?.name
          ) as ChatCompletionFunctionMessageParam;

          if (functionResponse) {
            value.push({
              //@ts-ignore
              type: ChatItemValueTypeEnum.tool,
              tools: [
                {
                  id: functionCall.id || '',
                  toolName: functionCall.toolName || '',
                  toolAvatar: functionCall.toolAvatar || '',
                  functionName: functionCall.name,
                  params: functionCall.arguments,
                  response: functionResponse.content || ''
                }
              ]
            });
          }
        }
      }

      return {
        dataId: item.dataId,
        obj,
        value
      } as ChatItemType;
    })
    .filter((item) => item.value.length > 0);
};