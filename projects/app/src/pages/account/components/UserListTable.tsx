import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Flex,
  Box,
  Button,
  useDisclosure,
  useTheme,
  MenuButton
} from '@chakra-ui/react';

import { BillSourceEnum, BillSourceMap } from '@fastgpt/global/support/wallet/bill/constants';
import { getUserBills } from '@/web/support/wallet/bill/api';
import type { BillItemType } from '@fastgpt/global/support/wallet/bill/type';
import { usePagination } from '@/web/common/hooks/usePagination';
import { useLoading } from '@/web/common/hooks/useLoading';
import { useRouter } from 'next/router';
import { useToast } from '@fastgpt/web/hooks/useToast';
import dayjs from 'dayjs';
import MyIcon from '@fastgpt/web/components/common/Icon';
import MyInput from '@/components/MyInput';
import DateRangePicker, { type DateRangeType } from '@/components/DateRangePicker';
import { addDays } from 'date-fns';
import dynamic from 'next/dynamic';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import { useTranslation } from 'next-i18next';
import MySelect from '@/components/Select';
import { useQuery } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { useUserStore } from '@/web/support/user/useUserStore';
import { getUserList, delUserById } from '@/web/support/user/api';
import Avatar from '@/components/Avatar';
import MyBox from '@/components/common/MyBox';
import { AddIcon } from '@chakra-ui/icons';
import CreateUserModal from './CreateUserModal';
import { UserType } from '@fastgpt/global/support/user/type';
import { TeamMemberRoleEnum } from '@fastgpt/global/support/user/team/constant';
import MyMenu from '@/components/MyMenu';
import { DatasetCollectionTypeEnum } from '@fastgpt/global/core/dataset/constants';
import { useConfirm } from '@/web/common/hooks/useConfirm';
const UpdatePswModal = dynamic(() => import('./UpdatePswModal'));
const UserListTable = () => {
  const BoxRef = useRef<HTMLDivElement>(null);
  const lastSearch = useRef('');
  const router = useRouter();
  const theme = useTheme();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { Loading } = useLoading();
  const { isPc } = useSystemStore();
  const { userInfo } = useUserStore();
  const [searchText, setSearchText] = useState('');
  const [userId, setUserId] = useState('');
  const { openConfirm, ConfirmModal } = useConfirm({
    title: '删除提示',
    content: '确认删除该用户信息？'
  });
  const {
    isOpen: isOpenCreateModal,
    onOpen: onOpenCreateModal,
    onClose: onCloseCreateModal
  } = useDisclosure();
  const {
    isOpen: isOpenUpdatePsw,
    onOpen: onOpenUpdatePsw,
    onClose: onCloseUpdatePsw
  } = useDisclosure();
  //   const [selectTmbId, setSelectTmbId] = useState(userInfo?.team?.tmbId);

  const {
    data: users,
    isLoading,
    Pagination,
    getData
  } = usePagination<UserType>({
    api: getUserList,
    pageSize: isPc ? 20 : 10,
    params: {
      searchText
    },
    defaultRequest: false,
    onChange() {
      if (BoxRef.current) {
        BoxRef.current.scrollTop = 0;
      }
    }
  });
  // change search
  const debounceRefetch = useCallback(
    debounce(() => {
      getData(1);
      lastSearch.current = searchText;
    }, 300),
    []
  );

  /* 点击删除 */
  const onclickDelUser = useCallback(
    async (id: string) => {
      try {
        await delUserById(id);
        toast({
          title: '删除成功',
          status: 'success'
        });
        getData(1);
      } catch (err: any) {
        toast({
          title: err?.message || '删除失败',
          status: 'error'
        });
      }
    },
    [toast, getData]
  );

  useEffect(() => {
    getData(1);
  }, [searchText]);

  return (
    <MyBox isLoading={isLoading} h={'100%'} py={[2, 4]}>
      <Flex ref={BoxRef} flexDirection={'column'} py={[1, 3]} h={'100%'}>
        {/* header */}
        <Flex px={[2, 6]} alignItems={'flex-start'} h={'35px'}>
          <Box flex={1} display={'flex'}>
            <Box fontWeight={'bold'} fontSize={['sm', 'lg']}>
              {'用户列表'}
            </Box>
          </Box>

          {isPc && (
            <Flex alignItems={'center'} mr={4}>
              <MyInput
                bg={'myGray.50'}
                w={['100%', '250px']}
                size={'sm'}
                h={'36px'}
                placeholder={t('common.Search') || ''}
                value={searchText}
                leftIcon={
                  <MyIcon
                    name="common/searchLight"
                    position={'absolute'}
                    w={'16px'}
                    color={'myGray.500'}
                  />
                }
                onChange={(e) => {
                  setSearchText(e.target.value);
                  debounceRefetch();
                }}
                onBlur={() => {
                  if (searchText === lastSearch.current) return;
                  getData(1);
                }}
                onKeyDown={(e) => {
                  if (searchText === lastSearch.current) return;
                  if (e.key === 'Enter') {
                    getData(1);
                  }
                }}
              />
            </Flex>
          )}
          <Button leftIcon={<AddIcon />} variant={'primaryOutline'} onClick={onOpenCreateModal}>
            {t('common.New Create')}
          </Button>
        </Flex>

        {/* user list table */}
        <TableContainer
          px={[2, 6]}
          mt={[0, 3]}
          position={'relative'}
          flex={'1 0 0'}
          overflowY={'auto'}
        >
          <Table variant={'simple'} fontSize={'sm'} draggable={false}>
            <Thead>
              <Tr bg={'myGray.100'} mb={2}>
                <Th borderBottom={'none'} py={4}>
                  {t('user.Account')}
                </Th>
                <Th borderBottom={'none'} py={4}>
                  {t('user.Avatar')}
                </Th>
                <Th borderBottom={'none'} py={4}>
                  {t('user.Team')}
                </Th>
                <Th borderBottom={'none'} py={4}>
                  {t('user.Timezone')}
                </Th>
                <Th borderBottom={'none'} py={4}></Th>
              </Tr>
            </Thead>
            <Tbody fontSize={'sm'}>
              {users.map((item) => (
                <Tr key={item._id} _hover={{ bg: 'myWhite.600' }} cursor={'pointer'}>
                  <Td>{item.username}</Td>
                  <Td>
                    {' '}
                    <Avatar src={item.avatar} borderRadius={'50%'} w={'35px'} h={'35px'} />
                  </Td>
                  <Td>{item.team.teamName}</Td>
                  <Td>{item.timezone}</Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    <MyMenu
                      width={100}
                      offset={[-70, 5]}
                      Button={
                        <MenuButton
                          w={'22px'}
                          h={'22px'}
                          borderRadius={'md'}
                          _hover={{
                            color: 'primary.500',
                            '& .icon': {
                              bg: 'myGray.200'
                            }
                          }}
                        >
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
                        </MenuButton>
                      }
                      menuList={[
                        // {
                        //     label: (
                        //         <Flex alignItems={'center'}>
                        //             <MyIcon name={'common/viewLight'} w={'14px'} mr={2}/>
                        //             {'详情'}
                        //         </Flex>
                        //     ),
                        //     onClick: () => setMoveCollectionData({collectionId: collection._id})
                        // },
                        {
                          label: (
                            <Flex alignItems={'center'}>
                              <MyIcon name={'edit'} w={'14px'} mr={2} />
                              {'重置密码'}
                            </Flex>
                          ),
                          onClick: () => {
                            onOpenUpdatePsw();
                            setUserId(item._id);
                          }
                        },
                        {
                          label: (
                            <Flex alignItems={'center'}>
                              <MyIcon
                                mr={1}
                                name={'delete'}
                                w={'14px'}
                                _hover={{ color: 'red.600' }}
                              />
                              <Box>{t('common.Delete')}</Box>
                            </Flex>
                          ),
                          onClick: () => openConfirm(() => onclickDelUser(item._id))()
                          // openDeleteConfirm(
                          //     () => {
                          //         onDelCollection(collection._id);
                          //     },
                          //     undefined,
                          //     collection.type === DatasetCollectionTypeEnum.folder
                          //         ? t('dataset.collections.Confirm to delete the folder')
                          //         : t('dataset.Confirm to delete the file')
                          // )()
                        }
                      ]}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>

        <Loading loading={isLoading} fixed={false} />
        {isOpenCreateModal && (
          <CreateUserModal onClose={onCloseCreateModal} onSuccess={() => getData(1)} />
        )}
        {isOpenUpdatePsw && <UpdatePswModal userId={userId} onClose={onCloseUpdatePsw} />}
        <ConfirmModal />
        {/*{!!billDetail && <BillDetail bill={billDetail} onClose={() => setBillDetail(undefined)}/>}*/}
      </Flex>
    </MyBox>
  );
};

export default React.memo(UserListTable);
