import { getTemplates, getTemplatePaths } from '@/web/core/template/api';
import MyModal from '@/components/MyModal';
import { useQuery } from '@tanstack/react-query';
import React, { Dispatch, useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Box } from '@chakra-ui/react';
import ParentPaths from '@/components/common/ParentPaths';

type PathItemType = {
  parentId: string;
  parentName: string;
};

const TemplateSelectContainer = ({
  isOpen,
  setParentId,
  paths,
  onClose,
  tips,
  children
}: {
  isOpen: boolean;
  setParentId: Dispatch<string>;
  paths: PathItemType[];
  onClose: () => void;
  tips?: string | null;
  children: React.ReactNode;
}) => {
  const { t } = useTranslation();

  return (
    <MyModal
      iconSrc="/imgs/module/db.png"
      title={
        <Box fontWeight={'normal'}>
          <ParentPaths
            paths={paths.map((path, i) => ({
              parentId: path.parentId,
              parentName: path.parentName
            }))}
            FirstPathDom={t('core.chat.Select template')}
            onClick={(e) => {
              setParentId(e);
            }}
          />
          {!!tips && (
            <Box fontSize={'sm'} color={'myGray.500'} fontWeight={'normal'}>
              {tips}
            </Box>
          )}
        </Box>
      }
      isOpen={isOpen}
      onClose={onClose}
      h={'80vh'}
      w={'100%'}
      maxW={['90vw', '900px']}
      isCentered
    >
      {children}
    </MyModal>
  );
};

export function useTemplateSelect() {
  const [parentId, setParentId] = useState<string>('');

  const { data, isFetching } = useQuery(['loadTemplateData', parentId], () =>
    Promise.all([getTemplates({ parentId }), getTemplatePaths(parentId)])
  );

  const paths = useMemo(() => [...(data?.[1] || [])], [data]);

  return {
    parentId,
    setParentId,
    templates: data?.[0] || [],
    paths,
    isFetching
  };
}

export default TemplateSelectContainer;
