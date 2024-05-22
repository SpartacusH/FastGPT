import React, { useMemo } from 'react';
import { Box, Button, Flex, IconButton } from '@chakra-ui/react';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { TabEnum } from '../../index';
import { useMyStep } from '@fastgpt/web/hooks/useStep';
import dynamic from 'next/dynamic';
import { useDatasetStore } from '@/web/core/dataset/store/dataset';
import { ImportDataSourceEnum } from '@fastgpt/global/core/dataset/constants';
import Provider from './Provider';

const FileLocal = dynamic(() => import('./diffSource/FileLocal'));
const FileLink = dynamic(() => import('./diffSource/FileLink'));
const FileCustomText = dynamic(() => import('./diffSource/FileCustomText'));
const TableLocal = dynamic(() => import('./diffSource/TableLocal'));

//定义ImportDataset组件，该组件用于导入数据
const ImportDataset = () => {
  const { t } = useTranslation();
  //获取路由对象
  const router = useRouter();
  const { datasetDetail } = useDatasetStore();
  //从路由查询参数中提取source和parentId
  const { source = ImportDataSourceEnum.fileLocal, parentId } = (router.query || {}) as {
    source: `${ImportDataSourceEnum}`;
    parentId?: string;
  };

  // Record<>是TypeScript 中的类型定义，它表示一个对象，其键是 ImportDataSourceEnum 枚举的值，值是一个包含 title 属性的对象数组
  const modeSteps: Record<`${ImportDataSourceEnum}`, { title: string }[]> = {
    [ImportDataSourceEnum.fileLocal]: [
      {
        title: t('core.dataset.import.Select file')
      },
      {
        title: t('core.dataset.import.Data Preprocessing')
      },
      {
        title: t('core.dataset.import.Upload data')
      }
    ],
    [ImportDataSourceEnum.fileLink]: [
      {
        title: t('core.dataset.import.Select file')
      },
      {
        title: t('core.dataset.import.Data Preprocessing')
      },
      {
        title: t('core.dataset.import.Upload data')
      }
    ],
    [ImportDataSourceEnum.fileCustom]: [
      {
        title: t('core.dataset.import.Select file')
      },
      {
        title: t('core.dataset.import.Data Preprocessing')
      },
      {
        title: t('core.dataset.import.Upload data')
      }
    ],
    [ImportDataSourceEnum.csvTable]: [
      {
        title: t('core.dataset.import.Select file')
      },
      {
        title: t('core.dataset.import.Data Preprocessing')
      },
      {
        title: t('core.dataset.import.Upload data')
      }
    ]
  };
  const steps = modeSteps[source];

  //解构赋值，两个控制步骤函数，一个显示值，和一个控件
  const { activeStep, goToNext, goToPrevious, MyStep } = useMyStep({
    defaultStep: 0, //步骤索引，从0开始
    steps
  });

  //定义ImportComponent，根据source的不同，渲染不同的组件将其赋值给ImportComponent,[source]为依赖数组，当source改变时，ImportComponent也会重新渲染
  const ImportComponent = useMemo(() => {
    if (source === ImportDataSourceEnum.fileLocal) return FileLocal;
    if (source === ImportDataSourceEnum.fileLink) return FileLink;
    if (source === ImportDataSourceEnum.fileCustom) return FileCustomText;
    if (source === ImportDataSourceEnum.csvTable) return TableLocal;
  }, [source]);

  //如果ImportComponent存在，则渲染Flex容器
  return ImportComponent ? (
    <Flex flexDirection={'column'} bg={'white'} h={'100%'} px={[2, 9]} py={[2, 5]}>
      <Flex>
        {/*根据是否为第一步 渲染第一个子组件为上一步/退出 */}
        {activeStep === 0 ? (
          <Flex alignItems={'center'}>
            <IconButton
              icon={<MyIcon name={'common/backFill'} w={'14px'} />}
              aria-label={''}
              size={'smSquare'}
              w={'26px'}
              h={'26px'}
              borderRadius={'50%'}
              variant={'whiteBase'}
              mr={2}
              onClick={() =>
                router.replace({
                  query: {
                    ...router.query,
                    currentTab: TabEnum.collectionCard
                  }
                })
              }
            />
            {t('common.Exit')}
          </Flex>
        ) : (
          <Button
            variant={'whiteBase'}
            leftIcon={<MyIcon name={'common/backFill'} w={'14px'} />}
            onClick={goToPrevious}
          >
            {t('common.Last Step')}
          </Button>
        )}
        <Box flex={1} />
      </Flex>
      {/* step */}
      <Box
        mt={4}
        mb={5}
        px={3}
        py={[2, 4]}
        bg={'myGray.50'}
        borderWidth={'1px'}
        borderColor={'borderColor.low'}
        borderRadius={'md'}
      >
        <Box maxW={['100%', '900px']} mx={'auto'}>
          <MyStep />
        </Box>
      </Box>
      <Provider dataset={datasetDetail} parentId={parentId} importSource={source}>
        <Box flex={'1 0 0'} overflow={'auto'} position={'relative'}>
          <ImportComponent activeStep={activeStep} goToNext={goToNext} />
        </Box>
      </Provider>
    </Flex>
  ) : null;
};

export default React.memo(ImportDataset);
