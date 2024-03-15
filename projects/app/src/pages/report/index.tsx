import React, { useCallback, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useDatasetStore } from '@/web/core/dataset/store/dataset';
import { useTemplateStore } from '@/web/core/template/store/template';
import { getInitChatInfo } from '@/web/core/chat/api';
import { getFileViewUrl } from '@/web/core/template/api';
import { getFileViewUrl as test } from '@/web/core/dataset/api';
import {
  Box,
  Flex,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  useTheme,
  Grid,
  IconButton,
  Button,
  BoxProps
} from '@chakra-ui/react';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import { useQuery } from '@tanstack/react-query';
import {
  delDatasetById,
  getDatasetPaths,
  putDatasetById,
  postCreateDataset
} from '@/web/core/dataset/api';
import {
  delTemplateById,
  getTemplatePaths,
  putTemplateById,
  postCreateTemplate
} from '@/web/core/template/api';
import { streamFetch } from '@/web/common/api/fetch';
import { useChatStore } from '@/web/core/chat/storeChat';
import { useLoading } from '@/web/common/hooks/useLoading';
import { useToast } from '@fastgpt/web/hooks/useToast';
import { customAlphabet } from 'nanoid';
import type { ChatHistoryItemType } from '@fastgpt/global/core/chat/type.d';
import { useTranslation } from 'next-i18next';
import ChatBox, { type ComponentRef, type StartChatFnProps } from '@/components/ChatBox';
import PageContainer from '@/components/PageContainer';
import SideBar from '@/components/SideBar';
import ChatHistorySlider from './components/ChatHistorySlider';
import SliderApps from './components/SliderApps';
import ChatHeader from './components/ChatHeader';
import { getErrText } from '@fastgpt/global/common/error/utils';
import { useUserStore } from '@/web/support/user/useUserStore';
import { serviceSideProps } from '@/web/common/utils/i18n';
import { useAppStore } from '@/web/core/app/store/useAppStore';
import { checkChatSupportSelectFileByChatModels } from '@/web/core/chat/utils';
import { chatContentReplaceBlock } from '@fastgpt/global/core/chat/utils';
import { ChatStatusEnum } from '@fastgpt/global/core/chat/constants';
import MyTooltip from '@/components/MyTooltip';
import CreateModal from './components/CreateModal';
import Avatar from '@/components/Avatar';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { AddIcon, QuestionOutlineIcon, SmallAddIcon } from '@chakra-ui/icons';
import { DatasetTypeEnum } from '@fastgpt/global/core/dataset/constants';
import { useConfirm } from '@/web/common/hooks/useConfirm';
import { useEditTitle } from '@/web/common/hooks/useEditTitle';
import { useDrag } from '@/web/common/hooks/useDrag';
import { useRequest } from '@/web/common/hooks/useRequest';
import TemplateTypeTag from '@/components/core/template/TemplateTypeTag';
import PermissionIconText from '@/components/support/permission/IconText';
import { PermissionTypeEnum } from '@fastgpt/global/support/permission/constant';
import {
  TemplateTypeEnum,
  TemplateTypeMap,
  FolderIcon,
  FolderImgUrl
} from '@fastgpt/global/core/template/constants';
import MyMenu from '@/components/MyMenu';
import SelectAiModel from '@/components/Select/SelectAiModel';
import { chatNodeSystemPromptTip, welcomeTextTip } from '@fastgpt/global/core/module/template/tip';
import PromptEditor from '@fastgpt/web/components/common/Textarea/PromptEditor';
import SearchParamsTip from '@/components/core/dataset/SearchParamsTip';
import VariableEdit from '@/components/core/module/Flow/components/modules/VariableEdit';
import MyTextarea from '@/components/common/Textarea/MyTextarea';
import EditForm from './components/EditForm';
import { useSticky } from '@/web/common/hooks/useSticky';
import ReactMarkdown from 'react-markdown';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 12);
//import MyEditor from "@/components/MyEditor";
import dynamic from 'next/dynamic';
import marked from 'marked';
import ReactDOM from 'react-dom';
const axios = require('axios');
const mammoth = require('mammoth');
const fs = require('fs');
const MyEditor = dynamic(() => import('../../components/MyEditor'), {
  ssr: false,
  loading: () => <p>Loading ...</p> //异步加载组件前的loading状态
});

const Chat = ({ appId, chatId }: { appId: string; chatId: string }) => {
  const isShow = useRef(false); //是否显示生成报告
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { parentId } = router.query as { appId: string };
  const { setLoading } = useSystemStore();
  const { userInfo } = useUserStore();
  const ChatBoxRef = useRef<ComponentRef>(null);
  const forbidRefresh = useRef(false);
  //是否显示生成报告
  const [isFlexVisible, setIsFlexVisible] = useState(false);
  //是否保存生成报告配置
  const [isSaveConfig, setIsSaveConfig] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState();
  const [currentFile, setCurrentFile] = useState();
  const [html, setHtml] = useState('');
  const [outputHtml, setOutputHtml] = useState('');
  const DeleteTipsMap = useRef({
    [TemplateTypeEnum.folder]: t('template.deleteFolderTips'),
    [TemplateTypeEnum.template]: t('core.template.Delete Confirm'),
    [TemplateTypeEnum.websiteTemplate]: t('core.template.Delete Confirm')
  });

  const { openConfirm, ConfirmModal } = useConfirm({
    type: 'delete'
  });

  const { myTemplates, loadTemplates, setTemplates, updateTemplate } = useTemplateStore();
  const { onOpenModal: onOpenTitleModal, EditModal: EditTitleModal } = useEditTitle({
    title: t('Rename')
  });
  const { moveDataId, setMoveDataId, dragStartId, setDragStartId, dragTargetId, setDragTargetId } =
    useDrag();
  const {
    isOpen: isOpenCreateModal,
    onOpen: onOpenCreateModal,
    onClose: onCloseCreateModal
  } = useDisclosure();

  /* 点击删除 */
  const { mutate: onclickDelTemplate } = useRequest({
    mutationFn: async (id: string) => {
      setLoading(true);
      await delTemplateById(id);
      return id;
    },
    onSuccess(id: string) {
      setTemplates(myTemplates.filter((item) => item._id !== id));
    },
    onSettled() {
      setLoading(false);
    },
    successToast: t('common.Delete Success'),
    errorToast: t('template.Delete Template Error')
  });
  //加载模版
  const { data, refetch, isFetching } = useQuery(
    ['loadTemplate', appId],
    () => {
      return Promise.all([loadTemplates(appId)]);
    },
    {
      onError(err) {
        toast({
          status: 'error',
          title: t(getErrText(err))
        });
      }
    }
  );
  //格式化模版
  const formatTemplates = useMemo(
    () =>
      myTemplates.map((item) => {
        return {
          ...item,
          label: TemplateTypeMap[item.type]?.label,
          icon: TemplateTypeMap[item.type]?.icon
        };
      }),
    [myTemplates]
  );

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

  const { isPc } = useSystemStore();
  const { Loading, setIsLoading } = useLoading();
  const { isOpen: isOpenSlider, onClose: onCloseSlider, onOpen: onOpenSlider } = useDisclosure();

  // get chat app info
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
        const res = await getInitChatInfo({ appId, chatId });
        const history = res.history.map((item) => ({
          ...item,
          status: ChatStatusEnum.finish
        }));

        setChatData({
          ...res,
          history
        });

        // have records.
        ChatBoxRef.current?.resetHistory(history);
        ChatBoxRef.current?.resetVariables(res.variables);
        if (res.history.length > 0) {
          setTimeout(() => {
            ChatBoxRef.current?.scrollToBottom('auto');
          }, 500);
        }
      } catch (e: any) {
        // reset all chat tore
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
  // 初始化聊天框
  useQuery(['init', { appId, chatId }], () => {
    // pc: redirect to latest model chat
    if (!appId && lastChatAppId) {
      return router.replace({
        query: {
          appId: lastChatAppId,
          chatId: lastChatId
        }
      });
    }
    if (!appId && myApps[0]) {
      return router.replace({
        query: {
          appId: myApps[0]._id,
          chatId: lastChatId
        }
      });
    }
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
              chatId: lastChatId
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

    return loadChatInfo({
      appId,
      chatId,
      loading: appId !== chatData.appId
    });
  });

  useQuery(['loadHistories', appId], () => (appId ? loadHistories({ appId }) : null));

  const BoxStyles: BoxProps = {
    px: 5,
    py: '16px',
    borderBottomWidth: '1px',
    borderBottomColor: 'borderColor.low'
  };
  const BoxBtnStyles: BoxProps = {
    cursor: 'pointer',
    px: 3,
    py: 1,
    borderRadius: 'md',
    _hover: {
      bg: 'myGray.150'
    }
  };
  const LabelStyles: BoxProps = {
    w: ['60px', '100px'],
    flexShrink: 0,
    fontSize: ['sm', 'md']
  };
  const { parentRef, divRef, isSticky } = useSticky();

  const convertMarkdownToHtml = (markdownText) => {
    return <ReactMarkdown source={markdownText}>{markdownText}</ReactMarkdown>;
  };
  //获取word文本内容
  const fetchWordFile = async (url) => {
    try {
      const response = await fetch(url); // 替换为你要读取的 Word 文件的 URL
      const arrayBuffer = await response.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      console.log(result.value);
      return result.value;
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveConfig = (value, saveResult) => {
    setOutputHtml(value);
    setIsSaveConfig(saveResult);
  };

  return (
    <Flex h={'100%'}>
      <Head>
        <title>{chatData.app.name}</title>
      </Head>
      {/* pc show myself apps */}
      {isPc && (
        <Box borderRight={theme.borders.base} w={'220px'} flexShrink={0}>
          <SliderApps appId={appId} />
        </Box>
      )}

      <PageContainer flex={'1 0 0'} w={0} p={[0, '16px']} position={'relative'}>
        <Flex h={'100%'} flexDirection={['column', 'row']} bg={'white'}>
          {/* pc always show history. */}
          {((children: React.ReactNode) => {
            return isPc || !appId ? (
              <SideBar>{children}</SideBar>
            ) : (
              <Drawer
                isOpen={isOpenSlider}
                placement="left"
                autoFocus={false}
                size={'xs'}
                onClose={onCloseSlider}
              >
                <DrawerOverlay backgroundColor={'rgba(255,255,255,0.5)'} />
                <DrawerContent maxWidth={'250px'}>{children}</DrawerContent>
              </Drawer>
            );
          })(
            <Flex
              position={'relative'}
              flexDirection={'column'}
              w={'100%'}
              h={'100%'}
              bg={'white'}
              size={'md'}
              borderRight={['', theme.borders.base]}
              whiteSpace={'nowrap'}
            >
              {!isFlexVisible && (
                <>
                  <MyTooltip offset={[0, 0]}>
                    <Flex pt={5} pb={2} px={[2, 5]} alignItems={'center'} cursor={'default'}>
                      <Avatar src={chatData.app.avatar} />
                      <Box
                        flex={'1 0 0'}
                        w={0}
                        ml={2}
                        fontWeight={'bold'}
                        className={'textEllipsis'}
                      >
                        {chatData.app.name + '-报告模版'}
                      </Box>
                      <Button
                        leftIcon={<AddIcon />}
                        variant={'primaryOutline'}
                        onClick={onOpenCreateModal}
                      >
                        {t('common.New Create')}
                      </Button>
                    </Flex>
                  </MyTooltip>
                  <Grid
                    p={4}
                    gridTemplateColumns={['1fr']}
                    //  gridTemplateColumns={['1fr', 'repeat(2,1fr)']}
                    gridGap={5}
                  >
                    {formatTemplates.map((template) => (
                      <MyTooltip key={template._id} label={t('app.To Report')}>
                        <Box
                          display={'flex'}
                          flexDirection={'column'}
                          key={template._id}
                          py={3}
                          px={5}
                          cursor={'pointer'}
                          borderWidth={1.5}
                          borderColor={
                            dragTargetId === template._id ? 'primary.600' : 'borderColor.low'
                          }
                          bg={'white'}
                          borderRadius={'md'}
                          minH={'130px'}
                          position={'relative'}
                          data-drag-id={
                            template.type === DatasetTypeEnum.folder ? template._id : undefined
                          }
                          draggable
                          onDragStart={(e) => {
                            setDragStartId(template._id);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            const targetId = e.currentTarget.getAttribute('data-drag-id');
                            if (!targetId) return;
                            DatasetTypeEnum.folder && setDragTargetId(targetId);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            setDragTargetId(undefined);
                          }}
                          onDrop={async (e) => {
                            e.preventDefault();
                            if (!dragTargetId || !dragStartId || dragTargetId === dragStartId)
                              return;
                            // update parentId
                            try {
                              await putDatasetById({
                                id: dragStartId,
                                parentId: dragTargetId
                              });
                              refetch();
                            } catch (error) {}
                            setDragTargetId(undefined);
                          }}
                          _hover={{
                            borderColor: 'primary.300',
                            boxShadow: '1.5',
                            '& .delete': {
                              display: 'block'
                            }
                          }}
                          onClick={() => {
                            setIsFlexVisible(!isFlexVisible);
                            setIsSaveConfig(false);
                            setCurrentTemplate(template);

                            const fileUrl = getFileViewUrl(template.fileId)
                              .then((res) => {
                                console.log('url:' + res);
                                fetchWordFile(res).then((re) => {
                                  setHtml(re);
                                });
                              })
                              .catch((err) => {
                                console.log(err);
                              });
                            setCurrentFile(fileUrl);
                          }}
                        >
                          {userInfo?.team.canWrite && template.isOwner && (
                            <Box
                              position={'absolute'}
                              top={3}
                              right={3}
                              borderRadius={'md'}
                              _hover={{
                                color: 'primary.500',
                                '& .icon': {
                                  bg: 'myGray.100'
                                }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <MyMenu
                                width={120}
                                Button={
                                  <Box w={'22px'} h={'22px'}>
                                    <MyIcon
                                      className="icon"
                                      name={'more'}
                                      h={'16px'}
                                      w={'16px'}
                                      px={1}
                                      py={1}
                                      borderRadius={'md'}
                                      cursor={'pointer'}
                                    />
                                  </Box>
                                }
                                menuList={[
                                  ...(template.permission === PermissionTypeEnum.private
                                    ? [
                                        {
                                          label: (
                                            <Flex alignItems={'center'}>
                                              <MyIcon
                                                name={'support/permission/publicLight'}
                                                w={'14px'}
                                                mr={2}
                                              />
                                              {t('permission.Set Public')}
                                            </Flex>
                                          ),
                                          onClick: () => {
                                            updateTemplate({
                                              id: template._id,
                                              permission: PermissionTypeEnum.public
                                            });
                                          }
                                        }
                                      ]
                                    : [
                                        {
                                          label: (
                                            <Flex alignItems={'center'}>
                                              <MyIcon
                                                name={'support/permission/privateLight'}
                                                w={'14px'}
                                                mr={2}
                                              />
                                              {t('permission.Set Private')}
                                            </Flex>
                                          ),
                                          onClick: () => {
                                            updateTemplate({
                                              id: template._id,
                                              permission: PermissionTypeEnum.private
                                            });
                                          }
                                        }
                                      ]),
                                  {
                                    label: (
                                      <Flex alignItems={'center'}>
                                        <MyIcon name={'edit'} w={'14px'} mr={2} />
                                        {t('Rename')}
                                      </Flex>
                                    ),
                                    onClick: () =>
                                      onOpenTitleModal({
                                        defaultVal: template.name,
                                        onSuccess: (val) => {
                                          if (val === template.name || !val) return;
                                          updateTemplate({
                                            id: template._id,
                                            name: val
                                          });
                                        }
                                      })
                                  },
                                  {
                                    label: (
                                      <Flex alignItems={'center'}>
                                        <MyIcon name={'delete'} w={'14px'} mr={2} />
                                        {t('common.Delete')}
                                      </Flex>
                                    ),
                                    onClick: () => {
                                      openConfirm(
                                        () => onclickDelTemplate(template._id),
                                        undefined,
                                        DeleteTipsMap.current[template.type]
                                      )();
                                    }
                                  }
                                ]}
                              />
                            </Box>
                          )}
                          <Flex alignItems={'center'} h={'38px'}>
                            <Avatar src={template.avatar} borderRadius={'md'} w={'28px'} />
                            <Box mx={3} className="textEllipsis3">
                              {template.name}
                            </Box>
                          </Flex>
                          <Box
                            flex={1}
                            className={'textEllipsis3'}
                            py={1}
                            wordBreak={'break-all'}
                            fontSize={'sm'}
                            color={'myGray.500'}
                          >
                            {template.intro || t('core.dataset.Folder placeholder')}
                          </Box>
                          <Flex alignItems={'center'} fontSize={'sm'}>
                            <Box flex={1}>
                              <PermissionIconText
                                permission={template.permission}
                                color={'myGray.600'}
                              />
                            </Box>
                            {/*{template.type !== TemplateTypeEnum.folder && (*/}
                            {/*    <TemplateTypeTag type={template.type} py={1} px={2}/>*/}
                            {/*)}*/}
                          </Flex>
                        </Box>
                      </MyTooltip>
                    ))}
                  </Grid>
                  <ConfirmModal />
                  <EditTitleModal />
                  {isOpenCreateModal && (
                    <CreateModal
                      onClose={onCloseCreateModal}
                      parentId={appId}
                      editCallback={async (name) => {
                        try {
                          refetch();
                        } catch (error) {
                          return Promise.reject(error);
                        }
                      }}
                    />
                  )}
                </>
              )}

              {isFlexVisible && (
                <>
                  <Box px={5} py={2}>
                    <Flex
                      alignItems={'center'}
                      cursor={'pointer'}
                      py={2}
                      px={3}
                      borderRadius={'md'}
                      _hover={{ bg: 'myGray.200' }}
                      onClick={() => {
                        setIsFlexVisible(false);
                      }}
                    >
                      <IconButton
                        mr={3}
                        icon={<MyIcon name={'common/backFill'} w={'18px'} color={'primary.500'} />}
                        bg={'white'}
                        boxShadow={'1px 1px 9px rgba(0,0,0,0.15)'}
                        size={'smSquare'}
                        borderRadius={'50%'}
                        aria-label={''}
                      />
                      {t('core.template.Exit Template')}
                    </Flex>
                  </Box>
                  <MyTooltip offset={[0, 0]}>
                    <Flex pt={2} pb={2} px={[2, 5]} alignItems={'center'} cursor={'default'}>
                      <Avatar src={chatData.app.avatar} />
                      <Box
                        flex={'1 0 0'}
                        w={0}
                        ml={2}
                        fontWeight={'bold'}
                        className={'textEllipsis'}
                      >
                        {'模版名称：' + currentTemplate.name}
                      </Box>
                    </Flex>
                  </MyTooltip>
                  <EditForm
                    divRef={divRef}
                    isSticky={isSticky}
                    appId={currentTemplate.id}
                    chatId={nanoid()}
                    sourceHtml={html}
                    onButtonClick={handleSaveConfig}
                  />
                </>
              )}
            </Flex>
          )}
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

            <Flex position={'relative'} flex={'1 0 0'} flexDirection={'row'}>
              <Box borderRight={'1px solid #E8EBF0'}>
                <MyEditor html={outputHtml} setHtml={setOutputHtml} />
              </Box>
              <Box>
                <MyEditor html={html} setHtml={setHtml} />
              </Box>
            </Flex>
          </Flex>
        </Flex>
        {/*<ReactMarkdown source={html}>{html}</ReactMarkdown>*/}
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
