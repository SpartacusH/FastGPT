import React, { useMemo } from 'react';
import {
  ModalBody,
  Flex,
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer
} from '@chakra-ui/react';
import { BillItemType } from '@fastgpt/global/support/wallet/bill/type.d';
import dayjs from 'dayjs';
import { BillSourceMap } from '@fastgpt/global/support/wallet/bill/constants';
import { formatStorePrice2Read } from '@fastgpt/global/support/wallet/bill/tools';
import MyModal from '@/components/MyModal';
import { useTranslation } from 'next-i18next';

const BillDetail = ({ bill, onClose }: { bill: BillItemType; onClose: () => void }) => {
  const { t } = useTranslation();
  const filterBillList = useMemo(
    () => bill.list.filter((item) => item && item.moduleName),
    [bill.list]
  );

  const {
    hasModel,
    hasTokens,
    hasInputTokens,
    hasOutputTokens,
    hasCharsLen,
    hasDuration,
    hasDataLen,
    hasDatasetSize
  } = useMemo(() => {
    let hasModel = false;
    let hasTokens = false;
    let hasInputTokens = false;
    let hasOutputTokens = false;
    let hasCharsLen = false;
    let hasDuration = false;
    let hasDataLen = false;
    let hasDatasetSize = false;

    bill.list.forEach((item) => {
      if (item.model !== undefined) {
        hasModel = true;
      }
      if (typeof item.tokenLen === 'number') {
        hasTokens = true;
      }
      if (typeof item.inputTokens === 'number') {
        hasInputTokens = true;
      }
      if (typeof item.outputTokens === 'number') {
        hasOutputTokens = true;
      }
      if (typeof item.charsLength === 'number') {
        hasCharsLen = true;
      }
      if (typeof item.duration === 'number') {
        hasDuration = true;
      }
      if (typeof item.datasetSize === 'number') {
        hasDatasetSize = true;
      }
    });

    return {
      hasModel,
      hasTokens,
      hasInputTokens,
      hasOutputTokens,
      hasCharsLen,
      hasDuration,
      hasDataLen,
      hasDatasetSize
    };
  }, [bill.list]);

  return (
    <MyModal
      isOpen={true}
      onClose={onClose}
      iconSrc="/imgs/modal/bill.svg"
      title={t('user.Bill Detail')}
      maxW={['90vw', '700px']}
    >
      <ModalBody>
        {/* <Flex alignItems={'center'} pb={4}>
          <Box flex={'0 0 80px'}>{t('wallet.bill.bill username')}:</Box>
          <Box>{t(bill.memberName)}</Box>
        </Flex> */}
        <Flex alignItems={'center'} pb={4}>
          <Box flex={'0 0 80px'}>{t('wallet.bill.Number')}:</Box>
          <Box>{bill.id}</Box>
        </Flex>
        <Flex alignItems={'center'} pb={4}>
          <Box flex={'0 0 80px'}>{t('wallet.bill.Time')}:</Box>
          <Box>{dayjs(bill.time).format('YYYY/MM/DD HH:mm:ss')}</Box>
        </Flex>
        <Flex alignItems={'center'} pb={4}>
          <Box flex={'0 0 80px'}>{t('wallet.bill.App name')}:</Box>
          <Box>{t(bill.appName) || '-'}</Box>
        </Flex>
        <Flex alignItems={'center'} pb={4}>
          <Box flex={'0 0 80px'}>{t('wallet.bill.Source')}:</Box>
          <Box>{t(BillSourceMap[bill.source]?.label)}</Box>
        </Flex>
        <Flex alignItems={'center'} pb={4}>
          <Box flex={'0 0 80px'}>{t('wallet.bill.Total')}:</Box>
          <Box fontWeight={'bold'}>{bill.total}元</Box>
        </Flex>
        <Box pb={4}>
          <Box flex={'0 0 80px'} mb={1}>
            {t('wallet.bill.Bill Module')}
          </Box>
          <TableContainer>
            <Table>
              <Thead>
                <Tr>
                  <Th>{t('wallet.bill.Module name')}</Th>
                  {hasModel && <Th>{t('wallet.bill.Ai model')}</Th>}
                  {hasTokens && <Th>{t('wallet.bill.Token Length')}</Th>}
                  {hasInputTokens && <Th>{t('wallet.bill.Input Token Length')}</Th>}
                  {hasOutputTokens && <Th>{t('wallet.bill.Output Token Length')}</Th>}
                  {hasCharsLen && <Th>{t('wallet.bill.Text Length')}</Th>}
                  {hasDuration && <Th>{t('wallet.bill.Duration')}</Th>}
                  {hasDatasetSize && (
                    <Th>{t('support.wallet.subscription.type.extraDatasetSize')}</Th>
                  )}
                  <Th>费用</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filterBillList.map((item, i) => (
                  <Tr key={i}>
                    <Td>{t(item.moduleName)}</Td>
                    {hasModel && <Td>{item.model ?? '-'}</Td>}
                    {hasTokens && <Td>{item.tokenLen ?? '-'}</Td>}
                    {hasInputTokens && <Td>{item.inputTokens ?? '-'}</Td>}
                    {hasOutputTokens && <Td>{item.outputTokens ?? '-'}</Td>}
                    {hasCharsLen && <Td>{item.charsLength ?? '-'}</Td>}
                    {hasDuration && <Td>{item.duration ?? '-'}</Td>}
                    {hasDatasetSize && <Td>{item.datasetSize ?? '-'}</Td>}
                    <Td>{formatStorePrice2Read(item.amount)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      </ModalBody>
    </MyModal>
  );
};

export default BillDetail;
