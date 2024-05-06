import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Box,
  Flex,
  Button,
  ModalFooter,
  ModalBody,
  Input,
  Grid,
  useTheme,
  Card
} from '@chakra-ui/react';
import { useSelectFile } from '@/web/common/file/hooks/useSelectFile';
import { useForm } from 'react-hook-form';
import { compressImgFileAndUpload } from '@/web/common/file/controller';
import { getErrText } from '@fastgpt/global/common/error/utils';
import { useToast } from '@fastgpt/web/hooks/useToast';
import { postCreateUser } from '@/web/support/user/api';
import { useRouter } from 'next/router';
import { appTemplates } from '@/web/core/app/templates';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import { useRequest } from '@/web/common/hooks/useRequest';
import Avatar from '@/components/Avatar';
import MyTooltip from '@/components/MyTooltip';
import MyModal from '@/components/MyModal';
import { useTranslation } from 'next-i18next';
import { MongoImageTypeEnum } from '@fastgpt/global/common/file/image/constants';
import { QuestionOutlineIcon } from '@chakra-ui/icons';
import MySelect from '@/components/Select';
import { timezoneList } from '@fastgpt/global/common/time/timezone';
import { useQuery } from '@tanstack/react-query';
import { getTeamItemList } from '@/web/support/user/team/api';
import { TeamMemberStatusEnum } from '@fastgpt/global/support/user/team/constant';
import { useUserStore } from '@/web/support/user/useUserStore';

type FormType = {
  avatar: string;
  username: string;
  password: string;
  teamId: string;
  timezone: string;
};

const CreateUserModal = ({
  onClose,
  onSuccess
}: {
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { t } = useTranslation();
  const [refresh, setRefresh] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const theme = useTheme();
  const { isPc, feConfigs } = useSystemStore();
  const timezones = useRef(timezoneList());
  const { register, setValue, getValues, handleSubmit } = useForm<FormType>({
    defaultValues: {
      avatar: '/icon/logo.svg',
      username: '',
      timezone: 'Asia/Shanghai'
    }
  });

  /* 文件选择*/
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
          type: MongoImageTypeEnum.appAvatar,
          file,
          maxW: 300,
          maxH: 300
        });
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

  /* 获取用户信息 */
  const { userInfo, initUserInfo } = useUserStore();
  /* 获取团队 */
  const {
    data: myTeams = [],
    isFetching: isLoadingTeams,
    refetch: refetchTeam
  } = useQuery(['getTeams', userInfo?._id], () => getTeamItemList(TeamMemberStatusEnum.active));
  const defaultTeam = useMemo(() => myTeams[0], [myTeams]);
  console.log(defaultTeam);
  //console.log(defaultTeam._id);
  if (defaultTeam) setValue('teamId', defaultTeam._id);
  console.log(myTeams);
  console.log(defaultTeam);
  const { mutate: onclickCreate, isLoading: creating } = useRequest({
    mutationFn: async (data: FormType) => {
      return postCreateUser(data);
    },
    onSuccess(id: string) {
      //  router.push(`/app/detail?appId=${id}`);
      onSuccess();
      onClose();
    },
    successToast: t('common.Create Success'),
    errorToast: t('common.Create Failed')
  });

  return (
    <MyModal
      iconSrc="/imgs/modal/team.svg"
      title={t('support.user.Create Account')}
      isOpen
      onClose={onClose}
      isCentered={!isPc}
    >
      <ModalBody>
        <Box color={'myGray.800'} fontWeight={'bold'}>
          {t('common.Set Account')}
        </Box>
        <Flex mt={3} alignItems={'center'}>
          <MyTooltip label={t('common.Set Avatar')}>
            <Avatar
              flexShrink={0}
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
            {...register('username', {
              required: '账号不能为空'
            })}
          />
        </Flex>
        <Flex mt={6} alignItems={'center'}>
          <Box flex={'0 0 80px'}> {'密码'}:&nbsp;</Box>
          <Box flex={1}>
            <Input
              flex={1}
              type={'password'}
              autoFocus
              bg={'myWhite.600'}
              {...register('password', {
                required: true
              })}
            />
          </Box>
        </Flex>
        <Flex mt={6} alignItems={'center'}>
          <Box flex={'0 0 80px'}> {'团队'}:&nbsp;</Box>
          <Box flex={1}>
            <MySelect
              w={'100%'}
              value={getValues('teamId')}
              list={myTeams.map((item) => ({
                label: item.teamName,
                value: item._id
              }))}
              onchange={(e) => {
                setValue('teamId', e);
                setRefresh((state) => !state);
              }}
            />
          </Box>
        </Flex>
        <Flex mt={6} alignItems={'center'}>
          <Box flex={'0 0 80px'}> {'时区'}:&nbsp;</Box>
          <Box flex={1}>
            <MySelect
              w={'100%'}
              value={getValues('timezone')}
              list={timezones.current.map((item) => ({
                label: item.name,
                value: item.value
              }))}
              onchange={(e) => {
                setValue('timezone', e);
                setRefresh((state) => !state);
              }}
            />
          </Box>
        </Flex>
      </ModalBody>

      <ModalFooter>
        <Button variant={'whiteBase'} mr={3} onClick={onClose}>
          {t('common.Close')}
        </Button>
        <Button isLoading={creating} onClick={handleSubmit((data) => onclickCreate(data))}>
          {t('common.Confirm Create')}
        </Button>
      </ModalFooter>

      <File onSelect={onSelectFile} />
    </MyModal>
  );
};

export default CreateUserModal;
