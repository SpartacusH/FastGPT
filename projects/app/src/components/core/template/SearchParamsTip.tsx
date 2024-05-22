import { useSystemStore } from '@/web/common/system/useSystemStore';
import { Flex, Table, Thead, Tbody, Tr, Th, Td, TableContainer } from '@chakra-ui/react';
import {
  TemplateSearchModeEnum,
  TemplateSearchModeMap
} from '@fastgpt/global/core/template/constants';
import { useTranslation } from 'next-i18next';
import React, { useMemo } from 'react';
import MyIcon from '@fastgpt/web/components/common/Icon';

const SearchParamsTip = ({
  searchMode,
  similarity = 0,
  limit = 1500,
  responseEmptyText
}: {
  searchMode: `${TemplateSearchModeEnum}`;
  similarity?: number;
  limit?: number;
  responseEmptyText?: string;
}) => {
  const { t } = useTranslation();
  const { reRankModelList } = useSystemStore();

  const hasReRankModel = reRankModelList.length > 0;
  const hasEmptyResponseMode = responseEmptyText !== undefined;

  return (
    <TableContainer
      bg={'primary.50'}
      borderRadius={'lg'}
      borderWidth={'1px'}
      borderColor={'primary.1'}
    >
      <Table fontSize={'xs'} overflow={'overlay'}>
        <Thead>
          <Tr color={'myGray.600'}>
            <Th>{t('core.template.search.search mode')}</Th>
            <Th>{t('core.template.search.Max Tokens')}</Th>
            <Th>{t('core.template.search.Min Similarity')}</Th>
            {hasReRankModel && <Th>{t('core.template.search.ReRank')}</Th>}
            <Th>{t('core.module.template.Query extension')}</Th>
            {hasEmptyResponseMode && <Th>{t('core.template.search.Empty result response')}</Th>}
          </Tr>
        </Thead>
        <Tbody>
          <Tr color={'myGray.800'}>
            <Td pt={0} pb={1}>
              <Flex alignItems={'center'}>
                <MyIcon
                  name={TemplateSearchModeMap[searchMode]?.icon as any}
                  w={'12px'}
                  mr={'1px'}
                />
                {t(TemplateSearchModeMap[searchMode]?.title)}
              </Flex>
            </Td>
            <Td pt={0} pb={1}>
              {limit}
            </Td>
            {hasEmptyResponseMode && <Th>{responseEmptyText !== '' ? '✅' : '❌'}</Th>}
          </Tr>
        </Tbody>
      </Table>
    </TableContainer>
  );
};

export default React.memo(SearchParamsTip);
