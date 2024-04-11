import React, { ChangeEvent, useCallback, useRef, useState } from 'react';
import { Box, FlexProps } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useToast } from '@fastgpt/web/hooks/useToast';
import MyBox from '@/components/common/MyBox';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { formatFileSize } from '@fastgpt/global/common/file/tools';
export type SelectFileItemType = {
  folderPath: string;
  file: File;
};
const FolderUploader = ({
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState([]);
  const filterTypeReg = new RegExp(
    `(${fileType
      .split(',')
      .map((item) => item.trim())
      .join('|')})$`,
    'i'
  );
  const selectFileCallback = useCallback(
    (files: SelectFileItemType[]) => {
      // size check
      if (!maxSize) {
        return onSelectFile(files);
      }
      const filterFiles = files.filter((item) => item.file.size <= maxSize);

      if (filterFiles.length < files.length) {
        toast({
          status: 'warning',
          title: t('common.file.Some file size exceeds limit', { maxSize: formatFileSize(maxSize) })
        });
      }
      return onSelectFile(filterFiles);
    },
    [maxSize, onSelectFile, t, toast]
  );
  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList) return;

    // 遍历获取到的文件列表
    const newFiles = Array.from(fileList).map((file) => {
      return {
        folderPath: '',
        file
      };
    });
    selectFileCallback(newFiles);

    // setFiles([...files, ...newFiles]);
    // 在这里可以添加处理文件（例如上传）的逻辑
  };

  const handleClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
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
      {...{
        borderColor: 'borderColor.high'
      }}
      {...props}
      onClick={handleClick}
    >
      <MyIcon name={'common/uploadFileFill'} w={'32px'} />
      <Box fontWeight={'bold'}>{t('common.file.Select folder')}</Box>
      {/* file type */}
      <Box color={'myGray.500'} fontSize={'xs'}>
        {t('common.file.Support file type', { fileType })}
      </Box>
      <Box color={'myGray.500'} fontSize={'xs'}>
        {/* max count */}
        {maxCount && t('common.file.Support max count', { maxCount })}
        {/* max size */}
        {maxSize && t('common.file.Support max size', { maxSize: formatFileSize(maxSize) })}
      </Box>
      <Box>
        <button onClick={handleClick}>选择文件夹</button>
        <input
          {...({
            ref: fileInputRef,
            type: 'file',
            webkitdirectory: 'true',
            multiple: true,
            style: { display: 'none' },
            onChange: handleFileSelect
          } as any)}
        />
      </Box>
    </MyBox>
  );
};

export default FolderUploader;
