import React, { useState } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import type { BoxProps } from '@chakra-ui/react';
import MyIcon from '@fastgpt/web/components/common/Icon';

interface Props extends BoxProps {}

const SideBar = (e?: Props) => {
  const {
    w = ['100%', '0 0 250px', '0 0 270px', '0 0 290px', '0 0 310px', '0 0 510px'],
    children,
    ...props
  } = e || {};

  const [foldSideBar, setFoldSideBar] = useState(false);
  return (
    <Box
      position={'relative'}
      // @ts-ignore
      flex={foldSideBar ? '0 0 0' : e.flex ? e.flex : w}
      w={['100%', 0]}
      h={'100%'}
      zIndex={1}
      transition={'0.2s'}
      _hover={{
        '& > div': { visibility: 'visible', opacity: 1 }
      }}
      {...props}
    >
      <Flex
        position={'absolute'}
        right={0}
        top={'50%'}
        transform={'translate(50%,-50%)'}
        alignItems={'center'}
        justifyContent={'flex-end'}
        pr={1}
        w={'36px'}
        h={'50px'}
        borderRadius={'10px'}
        bg={'rgba(0,0,0,0.5)'}
        cursor={'pointer'}
        transition={'0.2s'}
        {...(foldSideBar
          ? {
              opacity: 0.6
            }
          : {
              visibility: 'hidden',
              opacity: 0
            })}
        onClick={() => setFoldSideBar(!foldSideBar)}
      >
        <MyIcon
          name={'common/backLight'}
          transform={foldSideBar ? 'rotate(180deg)' : ''}
          w={'14px'}
          color={'white'}
        />
      </Flex>
      <Box
        position={'relative'}
        h={'100%'}
        overflow={foldSideBar ? 'hidden' : 'visible'}
        overflowY={'auto'}
      >
        {children}
      </Box>
    </Box>
  );
};

export default SideBar;
