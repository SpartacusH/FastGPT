import React, {useCallback, useMemo, useRef, useState} from 'react';
import Head from 'next/head';
import {useRouter} from 'next/router';
import {useDatasetStore} from '@/web/core/dataset/store/dataset';
import {useTemplateStore} from '@/web/core/template/store/template';
import {getInitChatInfo} from '@/web/core/chat/api';
import {
    Box,
    Flex,
    useDisclosure,
    Drawer,
    DrawerOverlay,
    DrawerContent,
    useTheme, Grid, IconButton, Button
} from '@chakra-ui/react';
import {useSystemStore} from '@/web/common/system/useSystemStore';
import {useQuery} from '@tanstack/react-query';
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
import {streamFetch} from '@/web/common/api/fetch';
import {useChatStore} from '@/web/core/chat/storeChat';
import {useLoading} from '@/web/common/hooks/useLoading';
import {useToast} from '@fastgpt/web/hooks/useToast';
import {customAlphabet} from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 12);
import type {ChatHistoryItemType} from '@fastgpt/global/core/chat/type.d';
import {useTranslation} from 'next-i18next';

import ChatBox, {type ComponentRef, type StartChatFnProps} from '@/components/ChatBox';
import PageContainer from '@/components/PageContainer';
import SideBar from '@/components/SideBar';
import ChatHistorySlider from './components/ChatHistorySlider';
import SliderApps from './components/SliderApps';
import ChatHeader from './components/ChatHeader';
import {getErrText} from '@fastgpt/global/common/error/utils';
import {useUserStore} from '@/web/support/user/useUserStore';
import {serviceSideProps} from '@/web/common/utils/i18n';
import {useAppStore} from '@/web/core/app/store/useAppStore';
import {checkChatSupportSelectFileByChatModels} from '@/web/core/chat/utils';
import {chatContentReplaceBlock} from '@fastgpt/global/core/chat/utils';
import {ChatStatusEnum} from '@fastgpt/global/core/chat/constants';
import MyTooltip from "@/components/MyTooltip";
import CreateModal from './components/CreateModal';
import Avatar from "@/components/Avatar";
import MyIcon from "@fastgpt/web/components/common/Icon";
import {AddIcon} from "@chakra-ui/icons";
import {DatasetTypeEnum} from "@fastgpt/global/core/dataset/constants";
import {useConfirm} from "@/web/common/hooks/useConfirm";
import {useEditTitle} from "@/web/common/hooks/useEditTitle";
import {useDrag} from '@/web/common/hooks/useDrag';
import dynamic from "next/dynamic";
import {useRequest} from '@/web/common/hooks/useRequest';
import TemplateTypeTag from '@/components/core/template/TemplateTypeTag';
import PermissionIconText from '@/components/support/permission/IconText';
import {PermissionTypeEnum} from '@fastgpt/global/support/permission/constant';
import {
    TemplateTypeEnum,
    TemplateTypeMap,
    FolderIcon,
    FolderImgUrl
} from '@fastgpt/global/core/template/constants';
import MyMenu from '@/components/MyMenu';

const Chat = ({appId, chatId}: { appId: string; chatId: string }) => {
    const isShow = useRef(false);//是否显示生成报告
    const router = useRouter();
    const theme = useTheme();
    const {t} = useTranslation();
    const {toast} = useToast();
    const {parentId} = router.query as { appId: string };
    const {setLoading} = useSystemStore();
    const {userInfo} = useUserStore();
    const ChatBoxRef = useRef<ComponentRef>(null);
    const forbidRefresh = useRef(false);
    const [isFlexVisible, setIsFlexVisible] = useState(false);

    const DeleteTipsMap = useRef({
        [TemplateTypeEnum.folder]: t('template.deleteFolderTips'),
        [TemplateTypeEnum.template]: t('core.template.Delete Confirm'),
        [TemplateTypeEnum.websiteTemplate]: t('core.template.Delete Confirm')
    });

    const {openConfirm, ConfirmModal} = useConfirm({
        type: 'delete'
    });

    const {myTemplates, loadTemplates, setTemplates, updateTemplate} = useTemplateStore();
    const {onOpenModal: onOpenTitleModal, EditModal: EditTitleModal} = useEditTitle({
        title: t('Rename')
    });
    const {moveDataId, setMoveDataId, dragStartId, setDragStartId, dragTargetId, setDragTargetId} =
        useDrag();
    const {
        isOpen: isOpenCreateModal,
        onOpen: onOpenCreateModal,
        onClose: onCloseCreateModal
    } = useDisclosure();

    /* 点击删除 */
    const {mutate: onclickDelTemplate} = useRequest({
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
    console.log(appId);
    const {data, refetch, isFetching} = useQuery(
        ['loadTemplate', appId],
        () => {
//            return Promise.all([loadTemplates(appId), getTemplatePaths(appId)]);
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
    // const paths = data?.[1] || [];

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

    const {isPc} = useSystemStore();
    const {Loading, setIsLoading} = useLoading();
    const {isOpen: isOpenSlider, onClose: onCloseSlider, onOpen: onOpenSlider} = useDisclosure();
    const reportTemplates = [{_id: 1, name: '海军研究报告', avater: '', intro: '海军研究报告生成模版'}, {
        _id: 1,
        name: '海军研究报告',
        avater: '',
        intro: '海军研究报告生成模版'
    }, {_id: 1, name: '海军研究报告', avater: '', intro: '海军研究报告生成模版'}, {
        _id: 1,
        name: '海军研究报告',
        avater: '',
        intro: '海军研究报告生成模版'
    }];

    const startChat = useCallback(
        async ({messages, controller, generatingMessage, variables}: StartChatFnProps) => {
            const prompts = messages.slice(-2);
            console.log(prompts)
            const completionChatId = chatId ? chatId : nanoid();

            const {responseText, responseData} = await streamFetch({
                data: {
                    messages: prompts,
                    variables,
                    appId,
                    chatId: completionChatId
                },
                onMessage: generatingMessage,
                abortCtrl: controller
            });

            const newTitle =
                chatContentReplaceBlock(prompts[0].content).slice(0, 20) ||
                prompts[1]?.value?.slice(0, 20) ||
                t('core.chat.New Chat');

            // new chat
            if (completionChatId !== chatId) {
                const newHistory: ChatHistoryItemType = {
                    chatId: completionChatId,
                    updateTime: new Date(),
                    title: newTitle,
                    appId,
                    top: false
                };
                pushHistory(newHistory);
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
                // update chat
                const currentChat = histories.find((item) => item.chatId === chatId);
                currentChat &&
                updateHistory({
                    ...currentChat,
                    updateTime: new Date(),
                    title: newTitle
                });
            }
            // update chat window
            setChatData((state) => ({
                ...state,
                title: newTitle,
                history: ChatBoxRef.current?.getChatHistories() || state.history
            }));

            return {responseText, responseData, isNewChat: forbidRefresh.current};
        },
        [appId, chatId, histories, pushHistory, router, setChatData, t, updateHistory]
    );

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
                const res = await getInitChatInfo({appId, chatId});
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
    useQuery(['init', {appId, chatId}], () => {
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

    useQuery(['loadHistories', appId], () => (appId ? loadHistories({appId}) : null));


    return (
        <Flex h={'100%'}>
            <Head>
                <title>{chatData.app.name}</title>
            </Head>
            {/* pc show myself apps */}
            {isPc && (
                <Box borderRight={theme.borders.base} w={'220px'} flexShrink={0}>
                    <SliderApps appId={appId}/>
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
                                <DrawerOverlay backgroundColor={'rgba(255,255,255,0.5)'}/>
                                <DrawerContent maxWidth={'250px'}>{children}</DrawerContent>
                            </Drawer>
                        );
                    })
                    (!isFlexVisible &&
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
                            <MyTooltip offset={[0, 0]}>
                                <Flex
                                    pt={5}
                                    pb={2}
                                    px={[2, 5]}
                                    alignItems={'center'}
                                    cursor={'default'}
                                >
                                    <Avatar src={chatData.app.avatar}/>
                                    <Box flex={'1 0 0'} w={0} ml={2} fontWeight={'bold'} className={'textEllipsis'}>
                                        {chatData.app.name + '-报告模版'}
                                    </Box>
                                    <Button leftIcon={<AddIcon/>} variant={'primaryOutline'}
                                            onClick={onOpenCreateModal}>
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
                                    <MyTooltip
                                        key={template._id}
                                        label={t('app.To Report')}
                                    >
                                        <Box
                                            display={'flex'}
                                            flexDirection={'column'}
                                            key={template._id}
                                            py={3}
                                            px={5}
                                            cursor={'pointer'}
                                            borderWidth={1.5}
                                            borderColor={dragTargetId === template._id ? 'primary.600' : 'borderColor.low'}
                                            bg={'white'}
                                            borderRadius={'md'}
                                            minH={'130px'}
                                            position={'relative'}
                                            data-drag-id={template.type === DatasetTypeEnum.folder ? template._id : undefined}
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
                                                if (!dragTargetId || !dragStartId || dragTargetId === dragStartId) return;
                                                // update parentId
                                                try {
                                                    await putDatasetById({
                                                        id: dragStartId,
                                                        parentId: dragTargetId
                                                    });
                                                    refetch();
                                                } catch (error) {
                                                }
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
                                                // router.push({
                                                //     pathname: '/template/detail',
                                                //     query: {
                                                //         templateId: template._id
                                                //     }
                                                // });
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
                                                                                    w={'14px'} mr={2}/>
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
                                                                        <MyIcon name={'edit'} w={'14px'} mr={2}/>
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
                                                                        <MyIcon name={'delete'} w={'14px'} mr={2}/>
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
                                                <Avatar src={template.avatar} borderRadius={'md'} w={'28px'}/>
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
                                                    <PermissionIconText permission={template.permission}
                                                                        color={'myGray.600'}/>
                                                </Box>
                                                {/*{template.type !== TemplateTypeEnum.folder && (*/}
                                                {/*    <TemplateTypeTag type={template.type} py={1} px={2}/>*/}
                                                {/*)}*/}
                                            </Flex>
                                        </Box>
                                    </MyTooltip>
                                ))}
                            </Grid>
                            <ConfirmModal/>
                            <EditTitleModal/>
                            {isOpenCreateModal && <CreateModal onClose={onCloseCreateModal} parentId={appId}
                                                               editCallback={async (name) => {
                                                                   try {
                                                                       refetch();
                                                                   } catch (error) {
                                                                       return Promise.reject(error);
                                                                   }
                                                               }}
                            />}
                        </Flex>
                    )
                    }

                    {
                        (isFlexVisible &&
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
                                <Box px={5} py={4}>
                                    <Flex
                                        alignItems={'center'}
                                        cursor={'pointer'}
                                        py={2}
                                        px={3}
                                        borderRadius={'md'}
                                        _hover={{bg: 'myGray.200'}}
                                        onClick={() => setIsFlexVisible(false)}
                                    >
                                        <IconButton
                                            mr={3}
                                            icon={<MyIcon name={'common/backFill'} w={'18px'} color={'primary.500'}/>}
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
                                    <Flex
                                        pt={5}
                                        pb={2}
                                        px={[2, 5]}
                                        alignItems={'center'}
                                        cursor={'default'}
                                    >
                                        <Avatar src={chatData.app.avatar}/>
                                        <Box flex={'1 0 0'} w={0} ml={2} fontWeight={'bold'} className={'textEllipsis'}>
                                            {chatData.app.name + '-报告模版'}
                                        </Box>
                                        <Button leftIcon={<AddIcon/>} variant={'primaryOutline'}
                                                onClick={onOpenCreateModal}>
                                            {t('common.New Create')}
                                        </Button>
                                    </Flex>
                                </MyTooltip>

                            </Flex>
                        )
                    }

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
                        <Box flex={1}>
                            <ChatBox
                                ref={ChatBoxRef}
                                showEmptyIntro
                                appAvatar={chatData.app.avatar}
                                userAvatar={userInfo?.avatar}
                                userGuideModule={chatData.app?.userGuideModule}
                                showFileSelector={checkChatSupportSelectFileByChatModels(chatData.app.chatModels)}
                                feedbackType={'user'}
                                onStartChat={startChat}
                                onDelMessage={(e) => delOneHistoryItem({...e, appId, chatId})}
                                appId={appId}
                                chatId={chatId}
                            />
                        </Box>
                    </Flex>
                </Flex>
                <Loading fixed={false}/>
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