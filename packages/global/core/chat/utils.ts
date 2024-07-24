import { IMG_BLOCK_KEY, FILE_BLOCK_KEY } from './constants';
import { ChatHistoryItemResType, ChatItemType } from './type.d';
export function chatContentReplaceBlock(content: string = '') {
  const regex = new RegExp(`\`\`\`(${IMG_BLOCK_KEY})\\n([\\s\\S]*?)\`\`\``, 'g');
  return content.replace(regex, '').trim();
}

export const getChatTitleFromChatMessage = (message?: ChatItemType, defaultValue = '新对话') => {
  // @ts-ignore
  const textMsg = message?.value.find((item) => item.type === ChatItemValueTypeEnum.text);

  if (textMsg?.text?.content) {
    return textMsg.text.content.slice(0, 20);
  }

  return defaultValue;
};
