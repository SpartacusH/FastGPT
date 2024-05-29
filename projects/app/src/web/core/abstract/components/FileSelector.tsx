import MyBox from '@/components/common/MyBox';
import { useSelectFile } from '@/web/common/file/hooks/useSelectFile';
import { useToast } from '@fastgpt/web/hooks/useToast';
import { Box, FlexProps } from '@chakra-ui/react';
import { formatFileSize } from '@fastgpt/global/common/file/tools';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useTranslation } from 'next-i18next';
import React, { DragEvent, useCallback, useState } from 'react';

export type SelectFileItemType = {
  folderPath: string;
  file: File;
};

//fileSelector组件接受多个props，fileType:文件类型，multiple：是否多选，maxCount：最大选择数量，maxSize：最大大小，isLoading：是否加载中，
//onSelectFile：选择文件后的回调函数,此外，组件还接受其他FlexProps类型的参数
const FileSelector = ({
  fileType,
  multiple,
  maxCount,
  maxSize,
  isLoading,
  onSelectFile,
  ...props
}: {
  fileType: string;
  multiple?: boolean;
  maxCount?: number;
  maxSize?: number;
  isLoading?: boolean;
  onSelectFile: (e: SelectFileItemType[]) => any;
} & FlexProps) => {
  //组件内部逻辑
  const { t } = useTranslation();
  const { toast } = useToast();
  const { File, onOpen } = useSelectFile({
    fileType,
    multiple,
    maxCount
  });
  const [isDragging, setIsDragging] = useState(false);

  const filterTypeReg = new RegExp(
    `(${fileType
      .split(',')
      .map((item) => item.trim())
      .join('|')})$`,
    'i'
  );
  // 定义一个回调函数，用于处理选择文件后的逻辑
  const selectFileCallback = useCallback(
    (files: SelectFileItemType[]) => {
      // size check
      if (!maxSize) {
        return onSelectFile(files);
      }
      //过滤掉超出大小限制的文件
      const filterFiles = files.filter((item) => item.file.size <= maxSize);

      if (filterFiles.length < files.length) {
        toast({
          status: 'warning',
          title: t('common.file.Some file size exceeds limit', { maxSize: formatFileSize(maxSize) })
        });
      }
      //无论文件是否都被接受，都调用onSelectFile，将过滤后的文件数组传递给它
      return onSelectFile(filterFiles);
    },
    //依赖项数组，当依赖项发生变化时，回调函数才会重新执行
    [maxSize, onSelectFile, t, toast]
  );

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    const fileList: SelectFileItemType[] = [];

    if (e.dataTransfer.items.length <= 1) {
      const traverseFileTree = async (item: any) => {
        return new Promise<void>((resolve, reject) => {
          if (item.isFile) {
            item.file((file: File) => {
              const folderPath = (item.fullPath || '').split('/').slice(2, -1).join('/');

              if (filterTypeReg.test(file.name)) {
                fileList.push({
                  folderPath,
                  file
                });
              }
              resolve();
            });
          } else if (item.isDirectory) {
            const dirReader = item.createReader();
            dirReader.readEntries(async (entries: any[]) => {
              for (let i = 0; i < entries.length; i++) {
                await traverseFileTree(entries[i]);
              }
              resolve();
            });
          }
        });
      };

      for await (const item of items) {
        await traverseFileTree(item.webkitGetAsEntry());
      }
    } else {
      const files = Array.from(e.dataTransfer.files);
      let isErr = files.some((item) => item.type === '');
      if (isErr) {
        return toast({
          title: t('file.upload error description'),
          status: 'error'
        });
      }

      fileList.push(
        ...files
          .filter((item) => filterTypeReg.test(item.name))
          .map((file) => ({
            folderPath: '',
            file
          }))
      );
    }

    selectFileCallback(fileList.slice(0, maxCount));
  };

  return (
    <MyBox
      isLoading={isLoading}
      display={'flex'}
      flexDirection={'column'}
      alignItems={'center'}
      justifyContent={'center'}
      px={3}
      py={[4, 7]}
      borderWidth={'1.5px'}
      borderStyle={'dashed'}
      borderRadius={'md'}
      cursor={'pointer'}
      _hover={{
        bg: 'primary.50',
        borderColor: 'primary.600'
      }}
      {...(isDragging
        ? {
            borderColor: 'primary.600'
          }
        : {
            borderColor: 'borderColor.high'
          })}
      {...props}
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      //点击触发选择文件
      onClick={onOpen}
    >
      <MyIcon name={'common/uploadFileFill'} w={'32px'} />
      <Box fontWeight={'bold'}>
        {isDragging
          ? t('file.Release the mouse to upload the file')
          : t('common.file.Select and drag file tip')}
      </Box>
      {/* file type */}
      <Box color={'myGray.500'} fontSize={'xs'}>
        {t('common.file.Support file type', { fileType })}
      </Box>
      <Box color={'myGray.500'} fontSize={'xs'}>
        {/* max count */}
        {/* {maxCount && t('common.file.Support max count', { maxCount })} */}
        {/* max size */}
        {/* {maxSize && t('common.file.Support max size', { maxSize: formatFileSize(maxSize) })} */}
      </Box>

      {/* File组件来显示已选择的文件列表，并监听文件选择事件，当文件被选择时，回调函数处理文件*/}
      <File
        onSelect={(files) =>
          selectFileCallback(
            files.map((file) => ({
              folderPath: '',
              file
            }))
          )
        }
      />
    </MyBox>
  );
};

export default React.memo(FileSelector);
