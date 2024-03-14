import React, { useCallback, useMemo, useRef, useState, useTransition } from 'react';
import {
  Box,
  Flex,
  Grid,
  BoxProps,
  useTheme,
  useDisclosure,
  Button,
  Image,
  Input
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { QuestionOutlineIcon, SmallAddIcon } from '@chakra-ui/icons';
import { useForm, useFieldArray } from 'react-hook-form';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import { reportModules2Form, getDefaultReportForm } from '@fastgpt/global/core/report/utils';
import type { ReportSimpleEditFormType } from '@fastgpt/global/core/report/type.d';
import { chatNodeSystemPromptTip, welcomeTextTip } from '@fastgpt/global/core/module/template/tip';
import { useRequest } from '@/web/common/hooks/useRequest';
import { useConfirm } from '@/web/common/hooks/useConfirm';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { ReportTypeEnum } from '@fastgpt/global/core/report/constants';
import { useDatasetStore } from '@/web/core/dataset/store/dataset';
import { useReportStore } from '@/web/core/report/store/useReportStore';
import { postForm2Modules } from '@/web/core/report/utils';

import dynamic from 'next/dynamic';
import MyTooltip from '@/components/MyTooltip';
import Avatar from '@/components/Avatar';
import MyIcon from '@fastgpt/web/components/common/Icon';
import VariableEdit from '@/components/core/module/Flow/components/modules/VariableEdit';
import MyTextarea from '@/components/common/Textarea/MyTextarea/index';
import { DatasetSearchModeMap } from '@fastgpt/global/core/dataset/constants';
import SelectAiModel from '@/components/Select/SelectAiModel';
import PromptEditor from '@fastgpt/web/components/common/Textarea/PromptEditor';
import { formatEditorVariablePickerIcon } from '@fastgpt/global/core/module/utils';
import SearchParamsTip from '@/components/core/dataset/SearchParamsTip';

const DatasetSelectModal = dynamic(() => import('@/components/core/module/DatasetSelectModal'));
const DatasetParamsModal = dynamic(() => import('@/components/core/module/DatasetParamsModal'));
const AIChatSettingsModal = dynamic(() => import('@/components/core/module/AIChatSettingsModal'));
const TTSSelect = dynamic(
  () => import('@/components/core/module/Flow/components/modules/TTSSelect')
);
const QGSwitch = dynamic(() => import('@/components/core/module/Flow/components/modules/QGSwitch'));
import { postCreateReport } from '@/web/core/report/api';
import { reportTemplates } from '@/web/core/report/templates';
import { useSelectFile } from '@/web/common/file/hooks/useSelectFile';
import { compressImgFileAndUpload } from '@/web/common/file/controller';
import { MongoImageTypeEnum } from '@fastgpt/global/common/file/image/constants';
import { getErrText } from '@fastgpt/global/common/error/utils';
import { useToast } from '@fastgpt/web/hooks/useToast';
import { PermissionTypeEnum } from '@fastgpt/global/support/permission/constant';
import { StartChatFnProps, useChatBox } from '@/components/ChatBox';
// import { streamFetch } from '@/web/common/api/fetch';
import { streamFetch } from '@/web/common/api/reportFetch';
import { chatContentReplaceBlock } from '@fastgpt/global/core/chat/utils';
import { ChatHistoryItemType } from '@fastgpt/global/core/chat/type';
import { customAlphabet } from 'nanoid';
import { useChatStore } from '@/web/core/chat/storeChat';
import { throttle } from 'lodash';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 12);
type generatingMessageProps = { text?: string; name?: string; status?: 'running' | 'finish' };
const EditForm = ({
  divRef,
  isSticky,
  appId,
  chatId
}: {
  divRef: React.RefObject<HTMLDivElement>;
  isSticky: boolean;
  appId: String;
  chatId: String;
}) => {
  const { toast } = useToast();
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { reportDetail, updateReportDetail } = useReportStore();
  const { loadAllDatasets, allDatasets } = useDatasetStore();
  const { isPc, llmModelList, reRankModelList } = useSystemStore();
  const [refresh, setRefresh] = useState(false);
  const [, startTst] = useTransition();
  const [reportId, setReportId] = useState('0');
  const [name, setName] = useState('Hello World');
  const [count, setCount] = useState(0);
  const { register, setValue, getValues, reset, handleSubmit, control, watch } =
    useForm<ReportSimpleEditFormType>({
      defaultValues: getDefaultReportForm()
    });

  const { fields: datasets, replace: replaceKbList } = useFieldArray({
    control,
    name: 'dataset.datasets'
  });

  const {
    isOpen: isOpenAIChatSetting,
    onOpen: onOpenAIChatSetting,
    onClose: onCloseAIChatSetting
  } = useDisclosure();
  const {
    isOpen: isOpenDatasetSelect,
    onOpen: onOpenKbSelect,
    onClose: onCloseKbSelect
  } = useDisclosure();
  const {
    isOpen: isOpenDatasetParams,
    onOpen: onOpenDatasetParams,
    onClose: onCloseDatasetParams
  } = useDisclosure();

  const { openConfirm: openConfirmSave, ConfirmModal: ConfirmSaveModal } = useConfirm({
    content: t('core.report.edit.Confirm Save Report Tip')
  });

  const { File, onOpen: onOpenSelectFile } = useSelectFile({
    fileType: '.jpg,.png',
    multiple: false
  });
  const onSelectFile = useCallback(
    async (e: File[]) => {
      const file = e[0];
      if (!file) return;
      try {
        const src = await compressImgFileAndUpload({
          type: MongoImageTypeEnum.reportAvatar,
          file,
          maxW: 300,
          maxH: 300
        });
        console.log(src);
        setValue('avatar', src);
        setRefresh((state) => !state);
      } catch (err: any) {
        toast({
          title: getErrText(err, t('common.error.Select avatar failed')),
          status: 'warning'
        });
      }
    },
    [setValue, t, toast]
  );

  const aiSystemPrompt = watch('aiSettings.systemPrompt');
  const selectLLMModel = watch('aiSettings.model');
  const datasetSearchSetting = watch('dataset');
  const variables = watch('userGuide.variables');
  const formatVariables = useMemo(() => formatEditorVariablePickerIcon(variables), [variables]);
  const searchMode = watch('dataset.searchMode');

  const chatModelSelectList = (() =>
    llmModelList.map((item) => ({
      value: item.model,
      label: item.name
    })))();

  const selectDatasets = useMemo(
    () => allDatasets.filter((item) => datasets.find((dataset) => dataset.datasetId === item._id)),
    [allDatasets, datasets]
  );

  const tokenLimit = useMemo(() => {
    return llmModelList.find((item) => item.model === selectLLMModel)?.quoteMaxToken || 3000;
  }, [selectLLMModel, llmModelList]);

  const { mutate: onSubmitSave, isLoading: isSaving } = useRequest({
    mutationFn: async (data: ReportSimpleEditFormType) => {
      // const template = reportTemplates.find((item) => item.id === data.templateId);
      // if (!template) {
      //   return Promise.reject(t('core.dataset.error.Template does not exist'));
      // }

      const modules = await postForm2Modules(data);
      console.log(data);
      const template = reportTemplates.find((item) => item.id === 'report-universal');
      if (!data.avatar) data.avatar = '/icon/logo.svg';
      const postData = {
        avatar: data.avatar,
        name: data.name,
        modules: template?.modules
      };
      postCreateReport(postData)
        .then(async (result) => {
          console.log(result);
          setValue('id', result);

          const updateData = {
            modules: template?.modules,
            type: ReportTypeEnum.report,
            permission: PermissionTypeEnum.private
          };

          await updateReportDetail(result, {
            modules,
            type: ReportTypeEnum.report,
            permission: undefined
          });
        })
        .catch((error) => {
          console.log(error);
        });
    },
    successToast: t('common.Save Success'),
    errorToast: t('common.Save Failed')
  });

  const { isSuccess: isInitd } = useQuery(
    ['init', reportDetail],
    () => {
      const formatVal = reportModules2Form({
        modules: reportDetail.modules
      });
      reset(formatVal);
      setRefresh(!refresh);
      return formatVal;
    },
    {
      enabled: !!reportDetail._id
    }
  );
  useQuery(['loadAllDatasets'], loadAllDatasets);

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

  const forbidRefresh = useRef(false);
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
  const generatingScroll = useCallback(
    throttle(() => {
      console.log('hhhhhh');
    }, 100),
    []
  );
  const generatingMessage1 = useCallback(
    ({ text = '', status, name }: generatingMessageProps) => {
      console.log(text);
    },
    [generatingScroll]
  );

  const startChat = useCallback(
    async ({ messages, controller, generatingMessage, variables }: StartChatFnProps) => {
      console.log(messages);
      const prompts = [];
      const completionChatId = chatId ? chatId : nanoid();
      controller = new AbortController();
      let inputText = getValues('userGuide.welcomeText');
      appId = getValues('id');
      console.log('appId:' + appId);
      messages = [{ dataId: nanoid(), role: 'user', content: inputText }];
      const { responseText, responseData } = await streamFetch({
        data: {
          history: [],
          prompt: '',
          messages: messages,
          reportId: appId
        },
        onMessage: generatingMessage1,
        abortCtrl: controller
      });

      const newTitle =
        chatContentReplaceBlock(prompts[0].content).slice(0, 20) ||
        prompts[1]?.value?.slice(0, 20) ||
        t('core.chat.New Chat');

      // // new chat
      // if (completionChatId !== chatId) {
      //   const newHistory: ChatHistoryItemType = {
      //     chatId: completionChatId,
      //     updateTime: new Date(),
      //     title: newTitle,
      //     appId,
      //     top: false
      //   };
      //   pushHistory(newHistory);
      //   if (controller.signal.reason !== 'leave') {
      //     forbidRefresh.current = true;
      //     router.replace({
      //       query: {
      //         chatId: completionChatId,
      //         appId
      //       }
      //     });
      //   }
      // } else {
      //   // update chat
      //   const currentChat = histories.find((item) => item.chatId === chatId);
      //   currentChat &&
      //     updateHistory({
      //       ...currentChat,
      //       updateTime: new Date(),
      //       title: newTitle
      //     });
      // }
      setValue('response', responseText);
      console.log(responseText);
      return { responseText, responseData, isNewChat: forbidRefresh.current };
    },
    [appId, chatId, histories, pushHistory, router, setChatData, t, updateHistory]
  );

  return (
    <Box>
      {/* title */}
      <Flex
        ref={divRef}
        position={'sticky'}
        top={-4}
        bg={'myGray.25'}
        py={4}
        justifyContent={'space-between'}
        alignItems={'center'}
        zIndex={10}
        px={4}
        {...(isSticky && {
          borderBottom: theme.borders.base,
          boxShadow: '0 2px 10px rgba(0,0,0,0.12)'
        })}
      >
        <Flex alignItems={'center'}>
          <Box fontSize={['md', 'xl']} color={'myGray.800'}>
            {t('core.report.Report params config')}
          </Box>
          <MyTooltip label={t('core.report.Simple Config Tip')} forceShow>
            <MyIcon name={'common/questionLight'} color={'myGray.500'} ml={2} />
          </MyTooltip>
        </Flex>
        <Button
          isLoading={isSaving}
          size={['sm', 'md']}
          variant={reportDetail.type === ReportTypeEnum.simple ? 'primary' : 'whitePrimary'}
          onClick={() => {
            if (reportDetail.type !== ReportTypeEnum.simple) {
              openConfirmSave(handleSubmit((data) => onSubmitSave(data)))();
            } else {
              handleSubmit((data) => onSubmitSave(data))();
            }
          }}
        >
          {t('core.report.Save Config')}
        </Button>
      </Flex>

      <Box px={4}>
        <Box bg={'white'} borderRadius={'md'} borderWidth={'1px'} borderColor={'borderColor.base'}>
          {/* simple mode select */}

          {/* avator && name */}
          <Box {...BoxStyles}>
            <Flex alignItems={'center'}>
              <MyIcon name={'text'} w={'20px'} color={'#8774EE'} />
              <Box mx={2}>{t('core.report.Input Name')}</Box>
            </Flex>
            <Flex mt={3} alignItems={'center'}>
              <MyTooltip label={t('common.Set Avatar')}>
                <Avatar
                  flexShrink={0}
                  {...register('avatar')}
                  src={getValues('avatar')}
                  w={['28px', '32px']}
                  h={['28px', '32px']}
                  cursor={'pointer'}
                  borderRadius={'md'}
                  onClick={onOpenSelectFile}
                />
              </MyTooltip>
              <Input
                flex={1}
                ml={4}
                autoFocus
                bg={'myWhite.600'}
                {...register('name', {
                  required: t('core.report.error.Report name can not be empty')
                })}
              />
              <input type={'hidden'} {...register('id')} />
            </Flex>
          </Box>

          {/* ai */}
          <Box {...BoxStyles}>
            <Flex alignItems={'center'}>
              <MyIcon name={'core/app/simpleMode/ai'} w={'20px'} />
              <Box ml={2} flex={1}>
                {t('app.AI Settings')}
              </Box>
            </Flex>
            <Flex alignItems={'center'} mt={5}>
              <Box {...LabelStyles}>{t('core.ai.Model')}</Box>
              <Box flex={'1 0 0'}>
                <SelectAiModel
                  width={'100%'}
                  value={getValues(`aiSettings.model`)}
                  list={chatModelSelectList}
                  onchange={(val: any) => {
                    setValue('aiSettings.model', val);
                    const maxToken =
                      llmModelList.find((item) => item.model === getValues('aiSettings.model'))
                        ?.maxResponse || 4000;
                    const token = maxToken / 2;
                    setValue('aiSettings.maxToken', token);
                    setRefresh(!refresh);
                  }}
                />
              </Box>
            </Flex>
          </Box>

          {/* dataset */}
          <Box {...BoxStyles}>
            <Flex alignItems={'center'}>
              <Flex alignItems={'center'} flex={1}>
                <MyIcon name={'core/app/simpleMode/dataset'} w={'20px'} />
                <Box ml={2}>{t('core.dataset.Choose Dataset')}</Box>
              </Flex>
              <Flex alignItems={'center'} {...BoxBtnStyles} onClick={onOpenKbSelect}>
                <SmallAddIcon />
                {t('common.Choose')}
              </Flex>
              <Flex alignItems={'center'} ml={3} {...BoxBtnStyles} onClick={onOpenDatasetParams}>
                <MyIcon name={'edit'} w={'14px'} mr={1} />
                {t('common.Params')}
              </Flex>
            </Flex>
            {getValues('dataset.datasets').length > 0 && (
              <Box my={3}>
                <SearchParamsTip
                  searchMode={searchMode}
                  similarity={getValues('dataset.similarity')}
                  limit={getValues('dataset.limit')}
                  usingReRank={getValues('dataset.usingReRank')}
                  usingQueryExtension={getValues('dataset.datasetSearchUsingExtensionQuery')}
                  responseEmptyText={getValues('dataset.searchEmptyText')}
                />
              </Box>
            )}
            <Grid
              gridTemplateColumns={['repeat(2, minmax(0, 1fr))', 'repeat(3, minmax(0, 1fr))']}
              gridGap={[2, 4]}
            >
              {selectDatasets.map((item) => (
                <MyTooltip key={item._id} label={t('core.dataset.Read Dataset')}>
                  <Flex
                    overflow={'hidden'}
                    alignItems={'center'}
                    p={2}
                    bg={'white'}
                    boxShadow={'0 4px 8px -2px rgba(16,24,40,.1),0 2px 4px -2px rgba(16,24,40,.06)'}
                    borderRadius={'md'}
                    border={theme.borders.base}
                    cursor={'pointer'}
                    onClick={() =>
                      router.push({
                        pathname: '/dataset/detail',
                        query: {
                          datasetId: item._id
                        }
                      })
                    }
                  >
                    <Avatar src={item.avatar} w={'18px'} mr={1} />
                    <Box flex={'1 0 0'} w={0} className={'textEllipsis'} fontSize={'sm'}>
                      {item.name}
                    </Box>
                  </Flex>
                </MyTooltip>
              ))}
            </Grid>
          </Box>

          {/* welcome */}
          <Box {...BoxStyles}>
            <Flex alignItems={'center'}>
              <MyIcon name={'core/app/simpleMode/chat'} w={'20px'} />
              <Box mx={2}>{t('core.report.Input Text')}</Box>
              <MyTooltip label={t('core.report.welcomeText')} forceShow>
                <QuestionOutlineIcon />
              </MyTooltip>
            </Flex>
            <MyTextarea
              mt={2}
              bg={'myWhite.400'}
              rows={5}
              placeholder={t('core.report.welcomeText')}
              onBlur={(e) => {
                setValue('userGuide.welcomeText', e.target.value || '');
              }}
            />
          </Box>

          {/* answer */}
          <Box {...BoxStyles}>
            <Flex alignItems={'center'}>
              <MyIcon name={'core/chat/chatLight'} w={'20px'} color={'#8774EE'} />
              <Box mx={2}>{t('core.report.Output Text')}</Box>
            </Flex>
            <MyTextarea
              mt={2}
              bg={'myWhite.400'}
              rows={5}
              onBlur={(e) => {
                setValue('response', e.target.value || '');
              }}
            />
            <Flex alignItems={'center'} justifyContent={'right'} mt={2}>
              <Button size={['sm', 'md']} variant={'primary'} onClick={startChat}>
                {t('core.chat.Send Message')}
              </Button>
            </Flex>
          </Box>
        </Box>
      </Box>

      <ConfirmSaveModal
        bg={reportDetail.type === ReportTypeEnum.simple ? '' : 'red.600'}
        countDown={5}
      />
      {isOpenAIChatSetting && (
        <AIChatSettingsModal
          onClose={onCloseAIChatSetting}
          onSuccess={(e) => {
            setValue('aiSettings', e);
            onCloseAIChatSetting();
          }}
          defaultData={getValues('aiSettings')}
          pickerMenu={formatVariables}
        />
      )}
      {isOpenDatasetSelect && (
        <DatasetSelectModal
          isOpen={isOpenDatasetSelect}
          defaultSelectedDatasets={selectDatasets.map((item) => ({
            datasetId: item._id,
            vectorModel: item.vectorModel
          }))}
          onClose={onCloseKbSelect}
          onChange={replaceKbList}
        />
      )}
      {isOpenDatasetParams && (
        <DatasetParamsModal
          {...datasetSearchSetting}
          maxTokens={tokenLimit}
          onClose={onCloseDatasetParams}
          onSuccess={(e) => {
            setValue('dataset', {
              ...getValues('dataset'),
              ...e
            });

            setRefresh((state) => !state);
          }}
        />
      )}

      <File onSelect={onSelectFile} />
    </Box>
  );
};

export default React.memo(EditForm);
