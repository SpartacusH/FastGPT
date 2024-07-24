import React, { useEffect, useMemo, useState } from 'react';
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
  Progress,
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
import { stringify } from 'querystring';

const DataProcess = dynamic(() => import('../commonProgress/DataProcess'), {
  loading: () => <Loading fixed={false} />
});
const Upload = dynamic(() => import('../commonProgress/Upload'));
const PreviewRawText = dynamic(() => import('../components/PreviewRawText'));

type FileItemType = ImportSourceItemType & { file: File ,resolveFileRate:number};
const fileType = '.txt, .doc, .docx, .csv, .pdf, .md, .html, .ofd, .wps';
const maxSelectFileCount = 300;

// let resolveFileRate=0
// FileLocal组件，按步骤显示不同组件
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

// 步骤为0时， 渲染SelectFile组件，处理文件选择和预处理逻辑
const SelectFile = React.memo(function SelectFile({
  goToNext,
  type
}: {
  goToNext: () => void;
  type: any;
}) {
  const router = useRouter();
  // 从router.query 对象中提取 datasetId 属性，并将其类型断言为可选字符串
  const { datasetId } = (router.query || {}) as { datasetId?: string };
  const { t } = useTranslation();
  const { feConfigs } = useSystemStore();
  const { sources, setSources } = useImportStore();
  // @ts-ignore
  // 已选择的文件数组
  const [selectFiles, setSelectFiles] = useState<FileItemType[]>(sources);
  // 预处理成功的文件数组
  const [successFiles, setSuccessFiles] = useState<FileItemType[]>([]);
  // let successFiles = useMemo(() => selectFiles.filter((item) => !item.errorMsg), [selectFiles]);
  const [isHandleLoading, setIsHandleLoading] = useState(false);
  const [previewRaw, setPreviewRaw] = useState<PreviewRawTextProps>();
  // let resolvefilecount:number=0;
  // useEffect(() => {
  //   setSources(successFiles);
  // }, [successFiles]);

  // 选择文件数组更新时，自动更新source数组和预处理成功的文件数组
  useEffect(() => {
    setSources(selectFiles.filter((item) => item.status==='处理成功'));
    setSuccessFiles(selectFiles.filter((item) => item.status==='处理成功'));
  }, [selectFiles]);

  
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  // 待预处理文件数组
  // const [waitResolvefiles,setWaitResolvefiles] = useState([]);
  // useEffect(() => {
  //   resolvefilecount = waitResolvefiles.length;
  // },[waitResolvefiles])


  // 打钩的文件id数组
  selectFiles.forEach((cur) => {
    // @ts-ignore
    if (cur?.id && !selectedItems.includes(cur?.id) && !cur.isDuplicate) {
      // @ts-ignore
      setSelectedItems([...selectedItems, cur?.id]);
    }
  });

  /* 复选框全选或取消全选操作*/
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

  /*复选框选择和取消操作*/
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

  /**********解析勾选的文件  ***************/
  // txt、csv、md、html文档直接解析，其他类型文档上传到服务器转成pdf文件，利用ocr对pdf文件进行文本内容的提取
  const handelFile = async () => {
    setIsHandleLoading(true);
    let i = 0;
    // 获取选中文件
    let selectedFiles = selectFiles.filter(function (cur) {
      // @ts-ignore
      return selectedItems.indexOf(cur.id) >= 0;
    });

    for (let i = 0; i < selectFiles.length; i++) {
      selectFiles[i].resolveFileRate= Math.floor(Math.random() * 5)
    }
    // 遍历选择文件，获取文件的富文本内容
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
              file.errorMsg = "resolve file failed"
              return { rawText: '' };
            }
          })();

          // test docx file
          // console.log("raw content:",rawText);

          let newSelectFiles = [...selectFiles];
          let fileIndex = newSelectFiles.findIndex((fileItem) => fileItem == file);
          file.rawText = rawText;
          file.errorMsg = rawText.length > 0 ? '' : file.errorMsg;
          // @ts-ignore
          file.status = rawText.length == 0 ? '处理失败' : '处理成功';
          file.resolveFileRate = rawText.length==0 ? Math.floor(Math.random() * 99) + 1:100
          newSelectFiles[fileIndex] = file;
          setSelectFiles(newSelectFiles);
          i++;
          // 记录处理数量
        } catch (error) {
          console.log(error);
          let newSelectFiles = [...selectFiles];
          let fileIndex = newSelectFiles.findIndex((fileItem) => fileItem == file);
          file.errorMsg = '获取文档内容出错';
          // @ts-ignore
          file.status = '处理失败';
          newSelectFiles[fileIndex] = file;
          setSelectFiles(newSelectFiles);
          // setWaitResolvefiles([]);
        }
      }
    }
    // setSuccessFiles(selectFiles.filter((item) => item.status==="处理成功"));
    // console.log(selectFiles);
    setIsHandleLoading(false);
  };

  /* 选择文件回调函数 */
  let { mutate: onSelectFile, isLoading } = useRequest({
    mutationFn: async (files: SelectFileItemType[]) => {
      {
        // 设置加载状态
        isLoading = true;
        // 遍历选择文件数组
        for await (const selectFile of files) {
          // 获取文件对象和文件路径
          const { file, folderPath } = selectFile;
          const relatedId = getNanoid(32);
          // 检查数据库中是否已有同名文件
          const isDuplicate = await checkFileExist({ datasetId, fileName: file.name });
          // 如果已选择文件的数组不存在同名文件则创建文件对象项，并更新selectFiles数组状态  过滤掉同名文件
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
              status: isDuplicate?'':'待预处理',
              resolveFileRate:0
            };

            // 状态更新方法，用于更新选中文件列表，state 为当前选择文件数组  
            // 在当前选中文件列表的开头添加一个新文件 item，并确保选中文件的总数不超过 maxSelectFileCount。如果新添加的文件数量超过了最大限制，
            // 则会裁剪数组，使其长度等于 maxSelectFileCount。
            setSelectFiles((state) => {
              const results = [item].concat(state).slice(0, maxSelectFileCount);
              return results;
            });
            //将通过同名校验的文件对象加入到数组selecteditems中和待预处理文件数组中  过滤掉同名文件
            if (!item.isDuplicate) {
              // @ts-ignore
              setSelectedItems((state) => {
                const results = [item.id].concat(state).slice(0, maxSelectFileCount);
                return results;
              });       
            }
          }
        }
        // setSelectFiles 函数来更新 selectedFiles 的状态，并对文件进行排序，使得重复文件在前
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
          maxSize={(feConfigs?.uploadFileMaxSize || 100) * 1024 * 1024}
          // maxSize={100 * 1024 * 1024}
          onSelectFile={onSelectFile}
        />
      )}
      {type != 'folder' && (
        <FileSelector
          isLoading={isLoading}
          fileType={fileType}
          multiple={true}
          maxCount={maxSelectFileCount}
          maxSize={(feConfigs?.uploadFileMaxSize || 100) * 1024 * 1024}
          // maxSize={100 * 1024 * 1024}
          onSelectFile={onSelectFile}
        />
      )}

      {/* 文件统计说明*/}
      {selectFiles.length > 0 && (
        <Flex px={[6, 6]} alignItems={'center'} h={'35px'}>
          <Box fontWeight={'bold'} fontSize={['sm', 'lg']} flex={1}>
            {'共选择' +
              selectFiles.length +
              '个文件' +
              (selectFiles.filter((item) => item.isDuplicate == true).length >= 0
                ? ' | 数据库同名文件数量：' +
                  selectFiles.filter((item) => item.isDuplicate == true).length
                : '')+
              ( ' | 选中文件数量：' + (selectFiles.length- selectFiles.filter((item) => item.isDuplicate == true).length) ) 
              }
          </Box>
        </Flex>
      )}
      {selectFiles.length > 0 && (
        <Flex px={[6, 6]} alignItems={'center'} h={'35px'}>
          <Box fontWeight={'bold'} fontSize={['sm', 'lg']} flex={1}>
            {(successFiles.length >0 ? '预处理进度 '+(Number(((successFiles.length+selectFiles.filter((item) => item.status == '处理失败').length)*100 / (successFiles.length+selectFiles.filter((item) => item.status == '处理失败').length+selectFiles.filter((item)=>item.status == '待预处理').length)).toFixed(1)))+'% |':'') +
              (successFiles.length>=0 ?'已成功'+successFiles.length+'个,':'') +
              (selectFiles.filter((item) => item.status == '处理失败').length >= 0
                ? '失败' + selectFiles.filter((item) => item.status == '处理失败').length +
                  '个,': '') +
              (selectFiles.filter((item)=>item.status == '待预处理').length >= 0 ? '待预处理' + selectFiles.filter((item)=>item.status == '待预处理').length+'个' : '')
            }
          </Box>
          {/* <Box fontWeight={'bold'} fontSize={['sm', 'lg']} flex={1}>
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
          </Box> */}
        </Flex>
      )}
      {/* 渲染用户选中的文件列表*/}
      {selectFiles.length > 0 && (
      <Flex direction="column" flex="1" minH="600px">
        <TableContainer
          px={[2, 6]}
          mt={[0, 3]}
          position={'relative'}
          flex={'1 0 0'}
          overflowY={'auto'}
          maxH="800px"
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
                  {'预处理进度'}
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
                  {/* 序号 */}
                  <Td w={'100px'}>{index + 1}</Td>  
                  {/* 名称 */}
                  <Td minW={'150px'} maxW={['200px', '300px']} draggable>
                    <Flex alignItems={'center'}>
                      <MyTooltip
                        key={item.id}
                        label={
                          (item.isDuplicate ? '该知识库中已存在同名文件;' : '') +
                          (item.status == '处理失败' ? '文件处理失败' : '')
                        }
                        // @ts-ignore
                        style={'display:flex'}
                      >
                        <MyIcon name={item.icon as any} w={'16px'} />
                        <Box
                          fontWeight={'bold'}
                          className="textEllipsis"
                          color={item.isDuplicate || item.status == '处理失败' ? 'red' : 'black'}
                          display={'inline'}
                        >
                          {item.sourceName}
                        </Box>
                      </MyTooltip>
                    </Flex>
                  </Td>
                  {/* 文件大小 */}
                  <Td textAlign={'center'}>{item.sourceSize}</Td>
                  {/* 预处理进度 */}
                  {!item.isDuplicate?
                  (<Td>
                    <Flex alignItems={'center'} fontSize={'xs'}>
                          <Progress
                            value={item.resolveFileRate}
                            h={'6px'}
                            w={'100%'}
                            maxW={'210px'}
                            size="sm"
                            borderRadius={'20px'}
                            colorScheme={'blue'}
                            bg="myGray.200"
                            hasStripe
                            isAnimated
                            mr={2}
                          />
                          {`${item.resolveFileRate}%`}
                    </Flex>
                  </Td>):
                  (<Td textAlign={'center'}>{'*'}</Td>)
                  }
                  {item.status==''?(<Td textAlign={'center'}>{'*'}</Td>):
                  <Td textAlign={'center'}>
                  <Box
                    display={'inline-flex'}
                    alignItems={'center'}
                    w={'auto'}
                    color={item.status != '处理失败' ? '#485264' : 'red'}
                    bg={'#F7F8FA'}
                    borderWidth={'1px'}
                    borderColor={'#76E4AA'}
                    px={3}
                    py={1}
                    borderRadius={'md'}
                  >
                    {item.status}
                  </Box>
                 </Td>
                  }
                  <Td textAlign={'center'}>
                    <Flex alignItems={'center'} justifyContent={'center'}>
                      <MyIcon
                        name={'common/closeLight'}
                        w={'18px'}
                        color={'myGray.500'}
                        cursor={'pointer'}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isHandleLoading) {
                            setSelectFiles((state) => state.filter((file) => file.id !== item.id));
                            // @ts-ignore
                            if (selectedItems.includes(item.id)) {
                              // 如果已选中，从列表中移除
                              setSelectedItems(selectedItems.filter((id) => id !== item.id));
                            }
                          } else {
                            alert('数据处理中，暂无法删除');
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

          {/*{isHandleLoading && (*/}
          {/*  <Box*/}
          {/*    position="absolute"*/}
          {/*    top={0}*/}
          {/*    left={0}*/}
          {/*    right={0}*/}
          {/*    bottom={0}*/}
          {/*    display="flex"*/}
          {/*    alignItems="center"*/}
          {/*    justifyContent="center"*/}
          {/*    backgroundColor="rgba(255, 255, 255, 0.7)"*/}
          {/*  >*/}
          {/*    <Spinner />*/}
          {/*  </Box>*/}
          {/*)}*/}
        </TableContainer>
        </Flex>
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

      <Box 
         mt={4}     //外边距上4
         mb={5}     //外边距下5
        //  px={3}     //内边距水平边距3
        //  py={[2, 4]}  //内边距垂直边距范围【2，4】
         textAlign={'right'} 
      >
        <Flex justify="flex-end" gap={3}>
        <Button
          isDisabled={selectFiles.filter((item)=>item.status == '待预处理').length === 0 || isLoading}
          isLoading={isHandleLoading}
          onClick={handelFile}
        >
          {/* {selectFiles.length > 0
            ? `${t('core.dataset.import.Total selected files', { total: selectedItems.length })} | `
            : ''} */}
          {'预处理'}
        </Button>
        
        <Button isDisabled={successFiles.length === 0 || isHandleLoading} onClick={goToNext}>
          {successFiles.length > 0
            ? `${t('core.dataset.import.Total handle files', { total: successFiles.length })} | `
            : ''}
          {t('common.Next Step')}
        </Button>
        </Flex>
        
      </Box>

      {previewRaw && <PreviewRawText {...previewRaw} onClose={() => setPreviewRaw(undefined)} />}
    </Box>
  );
});
