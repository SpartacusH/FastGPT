import React, { useEffect, useMemo, useState } from 'react';
import { Spinner } from '@chakra-ui/react';
import {
  Box,
  Flex,
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Td,
  Tbody,
  Image,
  MenuButton,
  useDisclosure,
  Button,
  Link,
  useTheme,
  Checkbox
} from '@chakra-ui/react';
import { ImportDataComponentProps } from '@/web/core/dataset/type.d';
import { ImportSourceItemType } from '@/web/core/dataset/type.d';
import FileSelector, { type SelectFileItemType } from '@/web/core/dataset/components/FileSelector';
import FolderUploader from '@/web/core/dataset/components/FolderUploader';
import { getFileIcon } from '@fastgpt/global/common/file/icon';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { formatFileSize } from '@fastgpt/global/common/file/tools';
import { useTranslation } from 'next-i18next';
import { getNanoid } from '@fastgpt/global/common/string/tools';
import { useRequest } from '@/web/common/hooks/useRequest';
import { readFileRawContent } from '@fastgpt/web/common/file/read';
import { getUploadBase64ImgController } from '@/web/common/file/controller';
import { MongoImageTypeEnum } from '@fastgpt/global/common/file/image/constants';
import MyTooltip from '@/components/MyTooltip';
import type { PreviewRawTextProps } from '../components/PreviewRawText';
import { useImportStore } from '../Provider';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import { checkFileExist } from '@/web/core/dataset/api';
import dynamic from 'next/dynamic';
import Loading from '@/components/Loading';
import { DatasetCollectionTypeEnum } from '@fastgpt/global/core/dataset/constants';
import { putDatasetCollectionById } from '@/web/core/dataset/api';
import { TabEnum } from '@/pages/dataset/detail';
import dayjs from 'dayjs';
import { TeamMemberRoleEnum } from '@fastgpt/global/support/user/team/constant';
import MyMenu from '@/components/MyMenu';
import { ImportDataSourceEnum } from '@/pages/dataset/detail/components/Import';
import { useRouter } from 'next/router';
import rowTabs from '@fastgpt/web/components/common/Tabs/RowTabs';

const DataProcess = dynamic(() => import('../commonProgress/DataProcess'), {
  loading: () => <Loading fixed={false} />
});
const Upload = dynamic(() => import('../commonProgress/Upload'));
const PreviewRawText = dynamic(() => import('../components/PreviewRawText'));

type FileItemType = ImportSourceItemType & { file: File };
const fileType = '.txt, .doc, .docx, .csv, .pdf, .md, .html, .ofd, .wps';
const maxSelectFileCount = 1000;
const FileLocal = ({ type, activeStep, goToNext }: ImportDataComponentProps) => {
  return (
    <>
      {activeStep === 0 && <SelectFile goToNext={goToNext} type={type} />}
      {activeStep === 1 && <DataProcess showPreviewChunks goToNext={goToNext} />}
      {activeStep === 2 && <Upload showPreviewChunks />}
    </>
  );
};

export default React.memo(FileLocal);

const SelectFile = React.memo(function SelectFile({
  goToNext,
  type
}: {
  goToNext: () => void;
  type: any;
}) {
  const router = useRouter();
  const { datasetId } = (router.query || {}) as { datasetId?: string };
  const { t } = useTranslation();
  const { feConfigs } = useSystemStore();
  const { sources, setSources } = useImportStore();
  // @ts-ignore
  const [selectFiles, setSelectFiles] = useState<FileItemType[]>(sources);
  const [successFiles, setSuccessFiles] = useState<FileItemType[]>([]);
  // let successFiles = useMemo(() => selectFiles.filter((item) => !item.errorMsg), [selectFiles]);
  const [isHandleLoading, setIsHandleLoading] = useState(false);
  const [previewRaw, setPreviewRaw] = useState<PreviewRawTextProps>();

  // useEffect(() => {
  //   setSources(successFiles);
  // }, [successFiles]);
  useEffect(() => {
    setSources(selectFiles);
    setSuccessFiles(selectFiles.filter((item) => !item.errorMsg));
  }, [selectFiles]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  selectFiles.forEach((cur) => {
    // @ts-ignore
    if (cur?.id && !selectedItems.includes(cur?.id) && !cur.isDuplicate) {
      // @ts-ignore
      setSelectedItems([...selectedItems, cur?.id]);
    }
  });

  /* 标题复选框勾选、取消*/
  const handleHeaderCheckboxChange = () => {
    if (isAllSelected) {
      // 如果当前是全选状态，则取消所有选中
      setSelectFiles([]);
    } else {
      // 否则，全选所有项目
      // @ts-ignore
      setSelectFiles(selectFiles);
    }
    setIsAllSelected(!isAllSelected);
  };

  /*复选框勾选、取消*/
  const handleCheckboxChange = (fileId: string) => {
    // @ts-ignore
    if (selectedItems.includes(fileId)) {
      // 如果已选中，从列表中移除
      setSelectedItems(selectedItems.filter((id) => id !== fileId));
    } else {
      // 如果未选中，添加到列表中
      // @ts-ignore
      setSelectedItems([...selectedItems, fileId]);
    }
  };

  /* 处理勾选的文件 */
  const handelFile = async () => {
    setIsHandleLoading(true);
    let i = 0;
    let selectedFiles = selectFiles.filter(function (cur) {
      // @ts-ignore
      return selectedItems.indexOf(cur.id) >= 0;
    });
    for await (const file of selectedFiles) {
      if (!file.rawText) {
        try {
          const { rawText } = await (() => {
            try {
              return readFileRawContent({
                // @ts-ignore
                file: file.file,
                uploadBase64Controller: (base64Img) =>
                  getUploadBase64ImgController({
                    base64Img,
                    type: MongoImageTypeEnum.collectionImage,
                    metadata: {
                      relatedId: file.id
                    }
                  })
              });
            } catch (error) {
              return { rawText: '' };
            }
          })();
          let newSelectFiles = [...selectFiles];
          let fileIndex = newSelectFiles.findIndex((fileItem) => fileItem == file);
          file.rawText = rawText;
          file.errorMsg = rawText.length > 0 ? '' : file.errorMsg;
          // @ts-ignore
          file.status = rawText.length == 0 ? '处理失败' : '处理成功';
          newSelectFiles[fileIndex] = file;
          setSelectFiles(newSelectFiles);
          i++;
        } catch (error) {
          console.log(error);
          let newSelectFiles = [...selectFiles];
          let fileIndex = newSelectFiles.findIndex((fileItem) => fileItem == file);
          file.errorMsg = '获取文档内容出错';
          // @ts-ignore
          file.status = '处理失败';
          newSelectFiles[fileIndex] = file;
          setSelectFiles(newSelectFiles);
        }
      }
    }
    setSuccessFiles(selectFiles.filter((item) => !item.errorMsg));
    console.log(selectFiles);
    setIsHandleLoading(false);
  };

  /* 选择文件 */
  let { mutate: onSelectFile, isLoading } = useRequest({
    mutationFn: async (files: SelectFileItemType[]) => {
      {
        isLoading = true;
        for await (const selectFile of files) {
          const { file, folderPath } = selectFile;
          const relatedId = getNanoid(32);
          const isDuplicate = await checkFileExist({ datasetId, fileName: file.name });

          if (selectFiles.filter((item) => item.file.name == file.name).length == 0) {
            // const { rawText } = await (() => {
            //   try {
            //     return readFileRawContent({
            //       file,
            //       uploadBase64Controller: (base64Img) =>
            //         getUploadBase64ImgController({
            //           base64Img,
            //           type: MongoImageTypeEnum.collectionImage,
            //           metadata: {
            //             relatedId
            //           }
            //         })
            //     });
            //   } catch (error) {
            //     return { rawText: '' };
            //   }
            // })();
            const rawText = '';
            const item: FileItemType = {
              id: relatedId,
              file,
              rawText,
              isDuplicate,
              chunks: [],
              chunkChars: 0,
              sourceFolderPath: folderPath,
              sourceName: file.name,
              sourceSize: formatFileSize(file.size),
              icon: getFileIcon(file.name),
              errorMsg: rawText.length === 0 ? t('common.file.Empty file tip') : '',
              status: '待处理'
            };
            setSelectFiles((state) => {
              const results = [item].concat(state).slice(0, maxSelectFileCount);
              return results;
            });
            //将未重名的文件加入到选中数组
            if (!item.isDuplicate) {
              // @ts-ignore
              setSelectedItems((state) => {
                const results = [item.id].concat(state).slice(0, maxSelectFileCount);
                return results;
              });
            }
          }
        }
        setSelectFiles((state) => {
          state.sort(function (a, b) {
            return Number(b.isDuplicate) - Number(a.isDuplicate);
          });
          return state;
        });
        isLoading = false;
      }
    }
  });

  // @ts-ignore
  return (
    <Box>
      {type == 'folder' && (
        <FolderUploader
          isLoading={isLoading}
          fileType={fileType}
          multiple
          maxCount={maxSelectFileCount}
          maxSize={(feConfigs?.uploadFileMaxSize || 500) * 1024 * 1024}
          onSelectFile={onSelectFile}
        />
      )}
      {type != 'folder' && (
        <FileSelector
          isLoading={isLoading}
          fileType={fileType}
          multiple
          maxCount={maxSelectFileCount}
          maxSize={(feConfigs?.uploadFileMaxSize || 500) * 1024 * 1024}
          onSelectFile={onSelectFile}
        />
      )}

      {/* 文件统计说明*/}
      {selectFiles.length > 0 && (
        <Flex px={[6, 6]} alignItems={'center'} h={'35px'}>
          <Box fontWeight={'bold'} fontSize={['sm', 'lg']} flex={1}>
            {'共上传' +
              selectFiles.length +
              '个文件' +
              (selectedItems.length > 0 ? ' | 选中' + selectedItems.length + '个文件' : '') +
              (selectFiles.filter((item) => item.isDuplicate == true).length > 0
                ? ' | ' +
                  selectFiles.filter((item) => item.isDuplicate == true).length +
                  '个重名文件'
                : '')}
          </Box>
        </Flex>
      )}
      {selectFiles.length > 0 && (
        <Flex px={[6, 6]} alignItems={'center'} h={'35px'}>
          <Box fontWeight={'bold'} fontSize={['sm', 'lg']} flex={1}>
            {(successFiles.length > 0 ? '处理成功' + successFiles.length + '个文件 | ' : '') +
              (selectFiles.filter((item) => item.status == '处理失败').length > 0
                ? '处理失败' +
                  selectFiles.filter((item) => item.status == '处理失败').length +
                  '个文件 |'
                : '') +
              (selectFiles.filter((item) => item.status == '待处理').length > 0
                ? '待处理' +
                  selectFiles.filter((item) => item.status == '待处理').length +
                  '个文件 |'
                : '')}
          </Box>
        </Flex>
      )}
      {/* 渲染用户选中的文件列表*/}
      {selectFiles.length > 0 && (
        <TableContainer
          px={[2, 6]}
          mt={[0, 3]}
          position={'relative'}
          flex={'1 0 0'}
          overflowY={'auto'}
        >
          <Table variant={'simple'} fontSize={'sm'} draggable={false}>
            <Thead draggable={false}>
              <Tr bg={'myGray.100'} mb={2}>
                <Th borderLeftRadius={'md'} w={'100px'} textAlign={'center'} py={4}>
                  {/*<Checkbox*/}
                  {/*    w={'40px'}*/}
                  {/*    sx={{*/}
                  {/*      '.chakra-checkbox__control': {*/}
                  {/*        width: '20px',*/}
                  {/*        height: '20px'*/}
                  {/*      }*/}
                  {/*    }}*/}
                  {/*    isChecked={isAllSelected}*/}
                  {/*    onChange={handleHeaderCheckboxChange}*/}
                  {/*/>*/}
                </Th>
                <Th borderBottom={'none'} w={'100px'} py={4}>
                  #
                </Th>
                <Th borderBottom={'none'} overflow={'hidden'} py={4}>
                  {t('common.Name')}
                </Th>
                <Th borderBottom={'none'} w={'150px'} textAlign={'center'} py={4}>
                  {t('dataset.File Size')}
                </Th>
                <Th borderBottom={'none'} w={'150px'} textAlign={'center'} py={4}>
                  {t('common.Status')}
                </Th>
                <Th
                  borderRightRadius={'md'}
                  w={'150px'}
                  textAlign={'center'}
                  borderBottom={'none'}
                  py={4}
                >
                  {t('common.Operation')}
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {selectFiles.map((item, index) => (
                <Tr key={item.id} _hover={{ bg: 'myWhite.600' }} cursor={'pointer'}>
                  <Td w={'100px'} textAlign={'center'} onClick={(e) => e.stopPropagation()} py={4}>
                    <Checkbox
                      w={'40px'}
                      isChecked={
                        // @ts-ignore
                        selectedItems.includes(item.id)
                      }
                      onChange={() => {
                        handleCheckboxChange(item.id);
                      }}
                      sx={{
                        '.chakra-checkbox__control': {
                          width: '20px',
                          height: '20px'
                        }
                      }}
                    />
                  </Td>
                  <Td w={'100px'}>{index + 1}</Td>
                  <Td minW={'150px'} maxW={['200px', '300px']} draggable>
                    <Flex alignItems={'center'}>
                      <MyTooltip
                        key={item.id}
                        label={item.isDuplicate ? '该知识库中已存在同名文件' : ''}
                        // @ts-ignore
                        style={'display:flex'}
                      >
                        <MyIcon name={item.icon as any} w={'16px'} />
                        <Box
                          fontWeight={'bold'}
                          className="textEllipsis"
                          color={item.isDuplicate ? 'red' : 'black'}
                          display={'inline'}
                        >
                          {item.sourceName}
                        </Box>
                      </MyTooltip>
                    </Flex>
                  </Td>
                  <Td textAlign={'center'}>{item.sourceSize}</Td>
                  <Td textAlign={'center'}>{item.status}</Td>
                  <Td textAlign={'center'}>
                    <Flex alignItems={'center'} justifyContent={'center'}>
                      <MyIcon
                        name={'common/closeLight'}
                        w={'18px'}
                        color={'myGray.500'}
                        cursor={'pointer'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectFiles((state) => state.filter((file) => file.id !== item.id));
                          // @ts-ignore
                          if (selectedItems.includes(item.id)) {
                            // 如果已选中，从列表中移除
                            setSelectedItems(selectedItems.filter((id) => id !== item.id));
                          }
                        }}
                      />
                      <MyIcon
                        // @ts-ignore
                        display={item.rawText.length > 0 ? 'block' : 'none'}
                        name={'common/viewLight'}
                        w={'18px'}
                        color={'myGray.500'}
                        cursor={'pointer'}
                        onClick={() =>
                          setPreviewRaw({
                            icon: item.icon,
                            title: item.sourceName,
                            rawText: item.rawText.slice(0, 10000)
                          })
                        }
                      />
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          {isHandleLoading && (
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
              backgroundColor="rgba(255, 255, 255, 0.7)"
            >
              <Spinner />
            </Box>
          )}
        </TableContainer>
      )}

      {/* render files */}
      {/*<Flex my={4} flexWrap={'wrap'} gap={5} alignItems={'center'}>*/}
      {/*  {selectFiles.map((item) => (*/}
      {/*    <MyTooltip key={item.id} label={t('core.dataset.import.Preview raw text')}>*/}
      {/*      <Flex*/}
      {/*        alignItems={'center'}*/}
      {/*        px={4}*/}
      {/*        py={3}*/}
      {/*        borderRadius={'md'}*/}
      {/*        bg={'myGray.100'}*/}
      {/*        cursor={'pointer'}*/}
      {/*        onClick={() =>*/}
      {/*          setPreviewRaw({*/}
      {/*            icon: item.icon,*/}
      {/*            title: item.sourceName,*/}
      {/*            rawText: item.rawText.slice(0, 10000)*/}
      {/*          })*/}
      {/*        }*/}
      {/*      >*/}
      {/*        <MyIcon name={item.icon as any} w={'16px'} />*/}
      {/*        <Box ml={1} mr={3}>*/}
      {/*          {item.sourceName}*/}
      {/*        </Box>*/}
      {/*        <Box mr={1} fontSize={'xs'} color={'myGray.500'}>*/}
      {/*          {item.sourceSize}*/}
      {/*          {item.rawText.length > 0 && (*/}
      {/*            <>,{t('common.Number of words', { amount: item.rawText.length })}</>*/}
      {/*          )}*/}
      {/*        </Box>*/}
      {/*        {item.errorMsg && (*/}
      {/*          <MyTooltip label={item.errorMsg}>*/}
      {/*            <MyIcon name={'common/errorFill'} w={'14px'} mr={3} />*/}
      {/*          </MyTooltip>*/}
      {/*        )}*/}
      {/*        <MyIcon*/}
      {/*          name={'common/closeLight'}*/}
      {/*          w={'14px'}*/}
      {/*          color={'myGray.500'}*/}
      {/*          cursor={'pointer'}*/}
      {/*          onClick={(e) => {*/}
      {/*            e.stopPropagation();*/}
      {/*            setSelectFiles((state) => state.filter((file) => file.id !== item.id));*/}
      {/*          }}*/}
      {/*        />*/}
      {/*      </Flex>*/}
      {/*    </MyTooltip>*/}
      {/*  ))}*/}
      {/*</Flex>*/}

      <Box textAlign={'right'}>
        <Button
          isDisabled={selectedItems.length === 0}
          isLoading={isHandleLoading}
          onClick={handelFile}
        >
          {selectFiles.length > 0
            ? `${t('core.dataset.import.Total selected files', { total: selectedItems.length })} | `
            : ''}
          {'处理文件'}
        </Button>
        <Button isDisabled={successFiles.length === 0 || isLoading} onClick={goToNext}>
          {successFiles.length > 0
            ? `${t('core.dataset.import.Total handle files', { total: successFiles.length })} | `
            : ''}
          {t('common.Next Step')}
        </Button>
      </Box>

      {previewRaw && <PreviewRawText {...previewRaw} onClose={() => setPreviewRaw(undefined)} />}
    </Box>
  );
});
