import React, { useCallback, useRef,useState,useEffect} from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getInitChatInfo } from '@/web/core/chat/api';
import {
  Box,
  Flex,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  useTheme
} from '@chakra-ui/react';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import { useQuery } from '@tanstack/react-query';
import { streamFetch, streamFetch1, streamFetch0 } from '@/web/common/api/fetch';
import { useChatStore } from '@/web/core/chat/storeChat';
import { useLoading } from '@fastgpt/web/hooks/useLoading';
import { useToast } from '@fastgpt/web/hooks/useToast';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 12);
import type { ChatHistoryItemType } from '@fastgpt/global/core/chat/type.d';
import { useTranslation } from 'next-i18next';

import ChatBox from '@/components/ChatBox';
import type { ComponentRef, StartChatFnProps } from '@/components/ChatBox/type.d';
import PageContainer from '@/components/PageContainer';
import SideBar from '@/components/SideBar';
// import ChatHistorySlider from './components/ChatHistorySlider';
// import SliderApps from './components/SliderApps';
import ChatHeader from './components/ChatHeader';
import { getErrText } from '@fastgpt/global/common/error/utils';
import { useUserStore } from '@/web/support/user/useUserStore';
import { serviceSideProps } from '@/web/common/utils/i18n';
import { useAppStore } from '@/web/core/app/store/useAppStore';
import { checkChatSupportSelectFileByChatModels } from '@/web/core/chat/utils';
import {chatContentReplaceBlock, getChatTitleFromChatMessage} from '@fastgpt/global/core/chat/utils';
import { ChatStatusEnum } from '@fastgpt/global/core/chat/constants';
//import { GPTMessages2Chats } from '@fastgpt/global/core/chat/adapt';
import { ImportSourceItemType } from '@/web/core/dataset/type.d';

import FileSelector, { type SelectFileItemType } from '@/web/core/abstract/components/FileSelector';
// import { readFileRawContent } from '@fastgpt/service/common/file/read/utils';
import { readFileRawContent } from '@fastgpt/web/common/file/read';
import { getUploadBase64ImgController} from '@/web/common/file/controller'
import { MongoImageTypeEnum } from '@fastgpt/global/common/file/image/constants';
import { getNanoid } from '@fastgpt/global/common/string/tools';
import { splitText2Chunks } from '@fastgpt/global/common/string/textSplitter';

// import { useImportStore } from '@/pages/dataset/detail/components/Import/Provider'
// import FileSelector,{ type SelectFileItemType }from '@/pages/dataset/detail/components/Import/components/FileSelector';

let fileContent: string ;
let chunks:string[] = [];
let filename:string
let filesize:number

const relatedId = getNanoid(32);
const abstract_prompt = "请你作为一个ai助手,总结所选文档的主要内容,并给出摘要,要求摘要内容简洁、准确,并使用中文回答";
const abstract_prompt_send = "请你作为一个ai助手,总结上述文字的主要内容形成摘要,要求摘要内容简洁、准确、不超过300字,并使用中文回答";
type FileItemType = ImportSourceItemType & { file: File };

const fileType = '.txt, .doc, .docx, .csv, .pdf, .md, .html, .ofd, .wps';
const maxSelectFileCount = 1000;



const Chat = ({ appId, chatId }: { appId: string; chatId: string }) => {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { toast } = useToast();

  const ChatBoxRef = useRef<ComponentRef>(null);
  const forbidRefresh = useRef(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // console.log(`Progress updated: ${progress}%`);
    // Any other side effects you want to trigger on progress update
  }, [progress]);
  

  const {
    lastChatAppId,
    setLastChatAppId,
    lastChatId,
    setLastChatId,
    histories,
    loadHistories,
    pushHistory,
    updateHistory,
    delOneHistory,
    clearHistories,
    chatData,
    setChatData,
    delOneHistoryItem
  } = useChatStore();
  const { myApps, loadMyApps } = useAppStore();
  const { userInfo } = useUserStore();

  const { isPc } = useSystemStore();
  const { Loading, setIsLoading } = useLoading();
  const { isOpen: isOpenSlider, onClose: onCloseSlider, onOpen: onOpenSlider } = useDisclosure();

  // 这段代码定义了一个名为 startChat 的异步函数，
  // 该函数处理开始聊天的操作，包括发送消息、处理响应、更新聊天历史记录和界面。
  const startChat = useCallback(
    async ({ messages, controller, generatingMessage, variables,file_content}: StartChatFnProps) => {
      // 递归处理方法，直到没有消息为止
      const prompts = messages.slice(-2);
      const completionChatId = chatId ? chatId : nanoid();
      let responseText_temp:String='';
      // let abstract_result:String[]=[];
      if(file_content && file_content.length>0){
        for(let i=0;i<file_content.length;i++){
          // console.log("文本分块：总"+ (file_content.length)+"块")
          // console.log("文本分块：第"+(i+1)+"块内容：");
          // console.log(file_content[i]);
          
          prompts.forEach((item) => {
            if(item.role === 'user' && file_content){
              // item.content =responseText_temp + file_content[i] + abstract_prompt_send;
              item.content = responseText_temp + file_content[i] + abstract_prompt_send;
              // console.log("display:")
              // console.log(item.content.length)
            }
          });
          responseText_temp = "";
          if(i===file_content.length-1) {
            break;
          }

          const {responseText} = await streamFetch({
            data:{
              messages:prompts,
              variables,
              appId,
              chatId: completionChatId
            },
            onMessage:()=>{},
            abortCtrl:controller
          });
          // console.log("文本分块：第"+(i+1)+"块响应："+responseText);
          // abstract_result.push(responseText);
          responseText_temp  = responseText;
          // console.log(i,file_content.length);
          setProgress(((i + 1) / file_content.length) * 100)
        }
      }

      // console.log(abstract_result);
      // console.log("prompts:");
      // console.log(prompts);

      // 调用 streamFetch 函数发送请求并获取响应
      const { responseText,responseData } = await streamFetch({
        data: {
          messages: prompts,
          variables,
          appId,
          chatId: completionChatId
        },
        // @ts-ignore
        onMessage: generatingMessage,
        abortCtrl: controller
      });
      setProgress(100);
      // console.log(responseText);


      //定义新对话的标题
      //const newTitle = getChatTitleFromChatMessage(GPTMessages2Chats(prompts)[0]);
      // @ts-ignore
       // @ts-ignore
      const newTitle=chatContentReplaceBlock(prompts[0].content||'')?.slice(0, 20) ||
          // @ts-ignore
        prompts[1]?.value?.slice(0, 20) ||
        t('core.chat.New Chat');
      // 如果当前对话的 ID 不等于新对话的 ID，则说明是新对话，需要将新对话添加到历史记录中
      // 否则，说明是同一个对话，只需要更新对话历史记录即可
      if (completionChatId !== chatId) {
        const newHistory: ChatHistoryItemType = {
          chatId: completionChatId,
          updateTime: new Date(),
          title: newTitle,
          appId,
          top: false
        };
        pushHistory(newHistory);
        // 如果中止信号的原因不是“离开”，则禁止刷新并使用 router.replace 更新路由
        if (controller.signal.reason !== 'leave') {
          forbidRefresh.current = true;
          router.replace({
            query: {
              chatId: completionChatId,
              appId
            }
          });
        }
      } else {
        // 查找当前对话的历史记录
        const currentChat = histories.find((item) => item.chatId === chatId);
        // 更新当前对话的历史记录
        currentChat &&
          updateHistory({
            ...currentChat,
            updateTime: new Date(),
            title: newTitle
          });
      }
      // 更新ChatData  state是现有的状态值
      setChatData((state) => ({
        ...state,
        title: newTitle,
        history: ChatBoxRef.current?.getChatHistories() || state.history
      }));
      // 返回响应文本和响应数据
      return { responseText, responseData, isNewChat: forbidRefresh.current };
    },
    [appId, chatId, histories, pushHistory, router, setChatData, updateHistory]
  );

  useQuery(['loadModels'], () => loadMyApps(false));

  // 定义loadChatInfo()方法，用于加载聊天信息
  const loadChatInfo = useCallback(
    async ({
      appId,
      chatId,
      loading = false
    }: {
      appId: string;
      chatId: string;
      loading?: boolean;
    }) => {
      try {
        loading && setIsLoading(true);
        //调用getInitChatInfo()方法获取聊天信息
        const res = await getInitChatInfo({ appId, chatId });
        const history = res.history.map((item) => ({
          ...item,
          dataId: item.dataId || nanoid(),
          status: ChatStatusEnum.finish
        }));

        setChatData({
          ...res,
          history
        });

        // 重置聊天历史记录和变量，如果历史记录长度大于0，则延时0.5秒后调用
        ChatBoxRef.current?.resetHistory(history);
        ChatBoxRef.current?.resetVariables(res.variables);
        if (res.history.length > 0) {
          setTimeout(() => {
            ChatBoxRef.current?.scrollToBottom('auto');
          }, 500);
        }
      } catch (e: any) {
        // 如果try{}中出现错误，则对错误进行处理
        setLastChatAppId('');
        setLastChatId('');
        toast({
          title: getErrText(e, t('core.chat.Failed to initialize chat')),
          status: 'error'
        });
        if (e?.code === 501) {
          router.replace('/app/list');
        } else if (chatId) {
          router.replace({
            query: {
              ...router.query,
              chatId: ''
            }
          });
        }
      }
      setIsLoading(false);
      return null;
    },
    [setIsLoading, setChatData, setLastChatAppId, setLastChatId, toast, t, router]
  );

  /*
  初始化聊天框,对话历史设置为空，强制使用第一个应用app
  */

  // 定义useQuery钩子，名字为init，useQuery 钩子被用于初始化和加载聊天信息
  // useQuery 钩子通常在组件的渲染过程中调用，以便在组件挂载时立即触发数据获取，并在相关依赖项发生变化时重新获取数据

  useQuery(['init', { appId, chatId }], () => {
    // 如果appId为空并且上次聊天的应用存在，则重定向至上次聊天的应用
    // if (!appId && lastChatAppId) {
    //   return router.replace({
    //     query: {
    //       appId: lastChatAppId,
    //       chatId: lastChatId
    //     }
    //   });
    // }
    // 如果没有appId但myApps数组中有应用，重定向到myApps[0]的第一个应用
    if (!appId && myApps[0]) {
      return router.replace({
        query: {
          appId: myApps[0]._id,
          chatId:''
          // chatId: lastChatId
        }
      });
    }
    // 如果没有appId并且前两者条件都不满足：
    //   异步加载应用列表loadMyApps并将结果存储在apps数组中
    //     当apps数组的长度为0时，显示错误提示并重定向到应用列表页面/app/list
    //     否则，将apps数组中的第一个应用的id存储在appId变量中，并重定向到该应用
    if (!appId) {
      (async () => {
        const apps = await loadMyApps();
        if (apps.length === 0) {
          toast({
            status: 'error',
            title: t('core.chat.You need to a chat app')
          });
          router.replace('/app/list');
        } else {
          router.replace({
            query: {
              appId: apps[0]._id,
              chatId:''
              // chatId: lastChatId
            }
          });
        }
      })();
      return;
    }

    // store id
    appId && setLastChatAppId(appId);
    setLastChatId(chatId);

    if (forbidRefresh.current) {
      forbidRefresh.current = false;
      return null;
    }
    // 调用loadChatInfo()方法加载聊天记录信息
    return loadChatInfo({
      appId,
      chatId,
      loading: appId !== chatData.appId
    });
  });

  // 定义useQuery钩子，名字为loadHistories，useQuery 钩子被用于加载聊天记录信息
  useQuery(['loadHistories', appId], () => (appId ? loadHistories({ appId }) : null));

  const onSelectFile =async (e: SelectFileItemType[]) => {
    const file = e[0].file
    // const extension = e[0].file.name.split('.')[1];
    if (!file) return;
    const file_size = e[0].file.size;
    filesize = file_size;
    filename = e[0].file.name;
    let chunksize:number;
    if(file_size>0){
      toast({
        title: "导入成功！",
        status: 'success'
      });
    }
    else{
      toast({
        title: "空文件，请重新选择！",
        status: 'error'
      });
    }

    try {
          const { rawText } = await (() => {
            try {
              return readFileRawContent({
                // @ts-ignore
                file: file,
                uploadBase64Controller: (base64Img: string) =>
                  getUploadBase64ImgController({
                    base64Img,
                    type: MongoImageTypeEnum.collectionImage,
                    metadata: {
                      relatedId: getNanoid(32)
                    }
                  })
              });
            } catch (error) {
              return { rawText: '' };
            }
          })();
          fileContent=rawText;
          // console.log("readFileRawContent.length:")
          // console.log(fileContent.length);

          //文本清洗
          fileContent = fileContent.replace(/\r\n/g,"");
          fileContent = fileContent.replace(/\s/g,"");

          // console.log(" After readFileRawContent.length:")
          // console.log(fileContent.length);

          if(fileContent.length<7000){
             chunksize = 7000;}
          else{
            chunksize =5000;
          }
          //文本分块
          const overlapRatio = 0.2;
          chunks = splitText2Chunks({
          text: fileContent,
          chunkLen: chunksize,
          overlapRatio,
        }).chunks;

        if(chunks.length>0){
          ChatBoxRef.current?.resetInputText_FileContent(abstract_prompt,chunks)
          // 清空聊天历史记录并新建一个聊天记录
          ChatBoxRef.current?.resetHistory([]);
          router.replace({
            query: {
              ...router.query,
              chatId: ''
            }
          });
          setLastChatId(chatId);
          setLastChatAppId(appId);
          }

        } catch (error) {
          console.log(error);
        }
    // const reader = new FileReader();
    // reader.readAsText(file);
    // reader.onload = function(event) {
    // if (event.target?.result && typeof event.target.result === 'string') {
    //       fileContent = event.target.result;
    //       //文本分块
    //       const overlapRatio = 0.2;
    //       chunks = splitText2Chunks({
    //       text: fileContent,
    //       chunkLen: chunksize,
    //       overlapRatio,
    //     }).chunks;
    //
    //     if(chunks.length>0){
    //       ChatBoxRef.current?.resetInputText_FileContent(abstract_prompt,chunks)
    //
    //       // 清空聊天历史记录并新建一个聊天记录
    //       ChatBoxRef.current?.resetHistory([]);
    //       router.replace({
    //         query: {
    //           ...router.query,
    //           chatId: ''
    //         }
    //       });
    //       setLastChatId(chatId);
    //       setLastChatAppId(appId);
    //       }
    //     }
    //
    //   }
  };
    

  return (
    <Flex h={'100%'}>
      <Head>
        <title>{chatData.app.name}</title>
      </Head>
      {/* pc show myself apps */}
      {/* {isPc && (
        <Box borderRight={theme.borders.base} w={'220px'} flexShrink={0}>
          <SliderApps apps={myApps} activeAppId={appId} />
        </Box>
      )} */}

      <PageContainer flex={'1 0 0'} w={0} p={[0, '16px']} position={'relative'}>
        <Flex h={'100%'} flexDirection={['column', 'row']} bg={'white'}>
          {/* chat container */}
          <Flex
            position={'relative'}
            h={[0, '100%']}
            w={['100%', 0]}
            flex={'1 0 0'}
            flexDirection={'column'}
          >
            {/* header */}
            <ChatHeader
              appAvatar={chatData.app.avatar}
              appName={chatData.app.name}
              appId={appId}
              history={chatData.history}
              chatModels={chatData.app.chatModels}
              onOpenSlider={onOpenSlider}
              showHistory
            />


            {/* chat box */}
            <Box flex={0.8}>
              <Box flex={0.2} w='60%' margin={'auto'} p={4}>
              <FileSelector
                  isLoading={false}
                  fileType={fileType}
                  multiple={false}
                  maxCount={maxSelectFileCount}
                  maxSize={(300) * 1024 * 1024}
                  onSelectFile={onSelectFile}
              />
              </Box>
              {chunks.length>0 &&
              (
                <Flex px={[6, 6]} alignItems={'center'} h={'35px'}>
                  <Box flex={0.6} w='60%' margin={'auto'} p={4}>
                    {'文件名:'  + filename +' | 文件大小:' + (filesize / 1024).toFixed(1) + 'kb | 生成进度:' + progress.toFixed(1) + '%'}
                  </Box>
                </Flex>
              )
              }
              <ChatBox
                ref={ChatBoxRef}
                showEmptyIntro={false}
                appAvatar={chatData.app.avatar}
                userAvatar={userInfo?.avatar}
                userGuideModule={chatData.app?.userGuideModule}
                showFileSelector={checkChatSupportSelectFileByChatModels(chatData.app.chatModels)}
                feedbackType={undefined}
                onStartChat={startChat}
                onDelMessage={(e) => delOneHistoryItem({ ...e, appId, chatId })}
                appId={appId}
                chatId={chatId}
                shareId={'11111'}
              />
            </Box>
          </Flex>
        </Flex>
        <Loading fixed={false} />
      </PageContainer>
    </Flex>
  );
};

export async function getServerSideProps(context: any) {
  return {
    props: {
      appId: context?.query?.appId || '',
      chatId: context?.query?.chatId || '',
      ...(await serviceSideProps(context))
    }
  };
}

export default Chat;
