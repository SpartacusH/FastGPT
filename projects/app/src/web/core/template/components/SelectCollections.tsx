import MyIcon from '@fastgpt/web/components/common/Icon';
import MyModal from '@/components/MyModal';
import ParentPaths from '@/components/common/ParentPaths';
import { useLoading } from '@/web/common/hooks/useLoading';
import { useRequest } from '@/web/common/hooks/useRequest';
import { getTemplateCollectionPathById, getTemplateCollections } from '@/web/core/template/api';
import { useTemplateStore } from '@/web/core/template/store/template';
import {
  Box,
  Flex,
  ModalFooter,
  Button,
  useTheme,
  Grid,
  Card,
  Image,
  ModalBody
} from '@chakra-ui/react';
import { TemplateCollectionTypeEnum } from '@fastgpt/global/core/template/constants';
import { getCollectionIcon } from '@fastgpt/global/core/template/utils';
import { useQuery } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';

const SelectCollections = ({
  templateId,
  type,
  defaultSelectedId = [],
  onClose,
  onChange,
  onSuccess,
  title,
  tip,
  max = 1,
  CustomFooter
}: {
  templateId: string;
  type: 'folder' | 'collection';
  onClose: () => void;
  onChange?: (e: { parentId: string; collectionIds: string[] }) => void | Promise<void>;
  onSuccess?: (e: { parentId: string; collectionIds: string[] }) => void | Promise<void>;
  defaultSelectedId?: string[];
  title?: string;
  tip?: string;
  max?: number;
  CustomFooter?: React.ReactNode;
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { templateDetail, loadTemplateDetail } = useTemplateStore();
  const { Loading } = useLoading();
  const [selectedTemplateCollectionIds, setSelectedTemplateCollectionIds] =
    useState<string[]>(defaultSelectedId);
  const [parentId, setParentId] = useState('');

  useQuery(['loadTemplateDetail', templateId], () => loadTemplateDetail(templateId));

  const { data, isLoading } = useQuery(['getTemplateCollections', parentId], () =>
    getTemplateCollections({
      templateId,
      parentId,
      selectFolder: type === 'folder',
      simple: true,
      pageNum: 1,
      pageSize: 50
    })
  );

  const formatCollections = useMemo(
    () =>
      data?.data.map((collection) => {
        const icon = getCollectionIcon(collection.type, collection.name);

        return {
          ...collection,
          icon
        };
      }) || [],
    [data]
  );
  const collections = useMemo(
    () =>
      type === 'folder'
        ? formatCollections.filter((item) => item._id !== defaultSelectedId[0])
        : formatCollections,
    [defaultSelectedId, formatCollections, type]
  );

  const { data: paths = [] } = useQuery(['getTemplateCollectionPathById', parentId], () =>
    getTemplateCollectionPathById(parentId)
  );

  const { mutate, isLoading: isResponding } = useRequest({
    mutationFn: async () => {
      if (type === 'folder') {
        await onSuccess?.({ parentId: paths[paths.length - 1]?.parentId || '', collectionIds: [] });
      } else {
        await onSuccess?.({
          parentId: paths[paths.length - 1]?.parentId || '',
          collectionIds: selectedTemplateCollectionIds
        });
      }

      return null;
    },
    errorToast: t('common.Request Error')
  });

  return (
    <MyModal
      isOpen
      onClose={onClose}
      maxW={['90vw', '900px']}
      w={'100%'}
      h={['90vh', '80vh']}
      isCentered
      iconSrc="/imgs/modal/move.svg"
      title={
        <Box>
          <ParentPaths
            paths={paths.map((path, i) => ({
              parentId: path.parentId,
              parentName: path.parentName
            }))}
            FirstPathDom={
              <>
                <Box fontWeight={'bold'} fontSize={['sm', 'lg']}>
                  {title
                    ? title
                    : type === 'folder'
                      ? t('common.Root folder')
                      : t('template.collections.Select Collection')}
                </Box>
                {!!tip && (
                  <Box fontSize={'sm'} color={'myGray.500'}>
                    {tip}
                  </Box>
                )}
              </>
            }
            onClick={(e) => {
              setParentId(e);
            }}
          />
        </Box>
      }
    >
      <ModalBody flex={'1 0 0'} overflow={'auto'}>
        <Grid
          gridTemplateColumns={['repeat(1,1fr)', 'repeat(2,1fr)']}
          gridGap={3}
          userSelect={'none'}
          mt={2}
        >
          {collections.map((item) =>
            (() => {
              const selected = selectedTemplateCollectionIds.includes(item._id);
              return (
                <Card
                  key={item._id}
                  p={3}
                  border={theme.borders.base}
                  boxShadow={'sm'}
                  cursor={'pointer'}
                  _hover={{
                    bg: 'primary.50',
                    borderColor: 'primary.300'
                  }}
                  {...(selected
                    ? {
                        bg: 'primary.200'
                      }
                    : {})}
                  onClick={() => {
                    if (item.type === TemplateCollectionTypeEnum.folder) {
                      setParentId(item._id);
                    } else {
                      let result: string[] = [];
                      if (max === 1) {
                        result = [item._id];
                      } else if (selected) {
                        result = selectedTemplateCollectionIds.filter((id) => id !== item._id);
                      } else if (selectedTemplateCollectionIds.length < max) {
                        result = [...selectedTemplateCollectionIds, item._id];
                      }
                      setSelectedTemplateCollectionIds(result);
                      onChange && onChange({ parentId, collectionIds: result });
                    }
                  }}
                >
                  <Flex alignItems={'center'} h={'38px'}>
                    <MyIcon name={item.icon as any} w={'18px'} />
                    <Box ml={3} fontSize={'sm'} className="textEllipsis">
                      {item.name}
                    </Box>
                  </Flex>
                </Card>
              );
            })()
          )}
        </Grid>
        {collections.length === 0 && (
          <Flex mt={'20vh'} flexDirection={'column'} alignItems={'center'}>
            <MyIcon name="empty" w={'48px'} h={'48px'} color={'transparent'} />
            <Box mt={2} color={'myGray.500'}>
              {t('common.folder.No Folder')}
            </Box>
          </Flex>
        )}
        <Loading loading={isLoading} fixed={false} />
      </ModalBody>
      {CustomFooter ? (
        <>{CustomFooter}</>
      ) : (
        <ModalFooter>
          <Button
            isLoading={isResponding}
            isDisabled={type === 'collection' && selectedTemplateCollectionIds.length === 0}
            onClick={mutate}
          >
            {type === 'folder' ? t('common.Confirm Move') : t('common.Confirm')}
          </Button>
        </ModalFooter>
      )}
    </MyModal>
  );
};

export default SelectCollections;
