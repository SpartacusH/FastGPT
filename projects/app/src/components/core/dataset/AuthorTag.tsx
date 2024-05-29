// @ts-ignore
import React from 'react';
import { Box, Flex, FlexProps } from '@chakra-ui/react';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useTranslation } from 'next-i18next';
import MyTooltip from '@/components/MyTooltip';

const AuthorTag = ({ name, ...props }: { name: string } & FlexProps) => {
  const { t } = useTranslation();
  return (
    <Flex alignItems={'center'} {...props}>
      <MyTooltip label={'创建人：' + name}>
        <Flex>
          <MyIcon name={'support/user/userLight'} w={'14px'} />
          <Box ml={'2px'}>{name}</Box>
        </Flex>
      </MyTooltip>
    </Flex>
  );
};

export default AuthorTag;
