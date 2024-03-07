import React, {useCallback, useState} from 'react';
import {Box, Flex, Button, ModalFooter, ModalBody, Input, Textarea, AttachmentIcon} from '@chakra-ui/react';
import {useSelectFile} from '@/web/common/file/hooks/useSelectFile';
import {useForm} from 'react-hook-form';
import {compressImgFileAndUpload} from '@/web/common/file/controller';
import {getErrText} from '@fastgpt/global/common/error/utils';
import {useToast} from '@fastgpt/web/hooks/useToast';
import {useRouter} from 'next/router';
import {useSystemStore} from '@/web/common/system/useSystemStore';
import {useRequest} from '@/web/common/hooks/useRequest';
import Avatar from '@/components/Avatar';
import MyTooltip from '@/components/MyTooltip';
import MyModal from '@/components/MyModal';
import {postCreateTemplate} from '@/web/core/template/api';
import type {CreateTemplateParams} from '@/global/core/template/api.d';
import MySelect from '@/components/Select';
import {useTranslation} from 'next-i18next';
import MyRadio from '@/components/common/MyRadio';
import {DatasetTypeEnum} from '@fastgpt/global/core/dataset/constants';
import {TemplateTypeEnum} from '@fastgpt/global/core/template/constants';
import {MongoImageTypeEnum} from '@fastgpt/global/common/file/image/constants';
import {QuestionOutlineIcon} from '@chakra-ui/icons';
import {uploadFile} from '@fastgpt/service/common/file/gridfs/controller';
import {postUploadFiles} from '@/web/common/file/api'
import {getUploadModel} from "@fastgpt/service/common/file/multer";
import {authCert} from "@fastgpt/service/support/permission/auth/common";
import {useUserStore} from '@/web/support/user/useUserStore';
import {uploadFiles} from '@/web/common/file/controller'
import {fi} from "date-fns/locale";
import {jsonRes} from '@fastgpt/service/common/response';
import { BucketNameEnum } from '@fastgpt/global/common/file/constants';
const CreateModal = ({onClose, parentId,editCallback}: { onClose: () => void; parentId?: string, editCallback: (name: string) => Promise<any>; }) => {
    const {t} = useTranslation();
    const [refresh, setRefresh] = useState(false);
    const {toast} = useToast();
    const router = useRouter();
    const {isPc, feConfigs, vectorModelList, datasetModelList} = useSystemStore();

    const filterNotHiddenVectorModelList = vectorModelList.filter((item) => !item.hidden);
    const {userInfo} = useUserStore();
    const {register, setValue, getValues, handleSubmit} = useForm<CreateTemplateParams>({
        defaultValues: {
            parentId:parentId,
            type: TemplateTypeEnum.template,
            avatar: '/icon/logo.svg',
            name: '',
            intro: '',
            fileId:'',
            fileName:''
        }
    });
    //选择文件
    const {File, onOpen: onOpenSelectFile} = useSelectFile({
        fileType: '.jpg,.png,.doc,.docx',
        multiple: false
    });
    const upload = getUploadModel({
        maxSize: 500 * 1024 * 1024
    });
    //选择文件后回调，处理上传文件
    const onSelectFile = useCallback(
        async (e: File[]) => {
            const file = e[0];
            console.log(file)
            if (!file) return;
            try {
                const res= await uploadFiles({
                    files:e,
                    bucketName:BucketNameEnum.dataset,
                     metadata:{},
                    percentListen:0
                });
                console.log(res)
                 setValue('fileId', res);
                 setValue("fileName",file.name)
                // setRefresh((state) => !state);

                // const src = await compressImgFileAndUpload({
                //     type: MongoImageTypeEnum.datasetAvatar,
                //     file,
                //     maxW: 300,
                //     maxH: 300
                // });
                // setValue('avatar', src);
                // setRefresh((state) => !state);

            } catch (err: any) {
                toast({
                    title: getErrText(err, t('common.avatar.Select Failed')),
                    status: 'warning'
                });
            }
        },
        [setValue, t, toast]
    );

    /* create a new kb and router to it */
    const {mutate: onclickCreate, isLoading: creating} = useRequest({
        mutationFn: async (data: CreateTemplateParams) => {
            const id = await postCreateTemplate(data);
            return editCallback(id);
        },
        successToast: t('common.Create Success'),
        errorToast: t('common.Create Failed'),
        onSuccess(data) {
            console.log(data);
            onClose();
            //router.push(`/report?appId=${data.parentId}`);
        }
    });


    return (
        <MyModal
            iconSrc="/imgs/module/db.png"
            title={t('core.template.Create template')}
            isOpen
            onClose={onClose}
            isCentered={!isPc}
            w={'450px'}
        >
            <ModalBody>
                <Box mt={5}>
                    <Box color={'myGray.800'} fontWeight={'bold'}>
                        {t('common.Set Name')}
                    </Box>
                    <Flex mt={1} alignItems={'center'}>
                        {/*<MyTooltip label={t('common.avatar.Select Avatar')}>*/}
                        {/*    <Avatar*/}
                        {/*        flexShrink={0}*/}
                        {/*        src={getValues('avatar')}*/}
                        {/*        w={['28px', '32px']}*/}
                        {/*        h={['28px', '32px']}*/}
                        {/*        cursor={'pointer'}*/}
                        {/*        borderRadius={'md'}*/}
                        {/*        onClick={onOpenSelectFile}*/}
                        {/*    />*/}
                        {/*</MyTooltip>*/}
                        <Input
                            ml={3}
                            flex={1}
                            autoFocus
                            bg={'myWhite.600'}
                            placeholder={t('common.Name')}
                            maxLength={30}
                            {...register('name', {
                                required: true
                            })}
                        />
                    </Flex>
                </Box>
                <Box mt={5}>
                    <Box color={'myGray.800'} fontWeight={'bold'}>
                        {t('common.Intro')}
                    </Box>
                    <Flex mt={1} alignItems={'center'}>
                        <Textarea
                            ml={3}
                            flex={1}
                            autoFocus
                            bg={'myWhite.600'}
                            placeholder={t('common.Intro')}
                            maxLength={500}
                            {...register('intro', {
                                required: false
                            })}
                        />
                    </Flex>
                </Box>
                <Box mt={5}>
                    <Box color={'myGray.800'} fontWeight={'bold'}>
                        {t('common.Upload Template File')}
                    </Box>
                    <Flex mt={1} alignItems={'center'}>
                        <Input
                            ml={3}
                            flex={1}
                            autoFocus
                            bg={'myWhite.600'}
                            placeholder={t('common.Upload Template File')}
                            maxLength={300}
                            value={getValues('fileName')}
                            {...register('fileName', {
                              required: true
                            })}
                        />
                        <Button  colorScheme='teal' variant='solid'
                                           onClick={onOpenSelectFile}>
                                       上传
                                   </Button>
                        {/*<FileSelector*/}
                        {/*    isLoading={isLoading}*/}
                        {/*    fileType={fileType}*/}
                        {/*    multiple*/}
                        {/*    maxCount={maxSelectFileCount}*/}
                        {/*    maxSize={(feConfigs?.uploadFileMaxSize || 500) * 1024 * 1024}*/}
                        {/*    onSelectFile={onSelectFile}*/}
                        {/*/>*/}
                    </Flex>
                </Box>
            </ModalBody>

            <ModalFooter>
                <Button variant={'whiteBase'} mr={3} onClick={onClose}>
                    {t('common.Close')}
                </Button>
                <Button isLoading={creating} onClick={handleSubmit((data) => onclickCreate(data))}>
                    {t('common.Confirm Create')}
                </Button>
            </ModalFooter>

            <File onSelect={onSelectFile}/>
        </MyModal>
    );
};

export default CreateModal;
