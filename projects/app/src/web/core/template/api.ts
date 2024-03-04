import { GET, POST, PUT, DELETE } from '@/web/common/api/request';
import type { ParentTreePathItemType } from '@fastgpt/global/common/parentFolder/type.d';
import type { TemplateItemType, TemplateListItemType } from '@fastgpt/global/core/template/type.d';
import type {
  GetTemplateCollectionsProps,
  GetTemplateDataListProps,
  UpdateTemplateCollectionParams
} from '@/global/core/api/templateReq.d';
import type {
  CreateTemplateCollectionParams,
  TemplateUpdateBody,
  LinkCreateTemplateCollectionParams,
  PostWebsiteSyncParams
} from '@fastgpt/global/core/template/api.d';
import type {
  GetTrainingQueueProps,
  GetTrainingQueueResponse,
  SearchTestProps,
  SearchTestResponse
} from '@/global/core/template/api.d';
import type {
  UpdateTemplateDataProps,
  CreateTemplateParams,
  InsertOneTemplateDataProps
} from '@/global/core/template/api.d';
import type {
  PushTemplateDataProps,
  PushTemplateDataResponse
} from '@fastgpt/global/core/template/api.d';
import type { TemplateCollectionItemType } from '@fastgpt/global/core/template/type';
import {
  TemplateCollectionSyncResultEnum,
  TemplateTypeEnum
} from '@fastgpt/global/core/template/constants';
import type { TemplateDataItemType } from '@fastgpt/global/core/template/type';
import type { TemplateCollectionsListItemType } from '@/global/core/template/type.d';
import { PagingData } from '@/types';

/* ======================== template ======================= */
export const getTemplates = (data: { parentId?: string; type?: `${TemplateTypeEnum}` }) =>
  GET<TemplateListItemType[]>(`/core/template/list`, data);

/**
 * get type=template list
 */
export const getAllTemplate = () => GET<TemplateListItemType[]>(`/core/template/allTemplate`);

export const getTemplatePaths = (parentId?: string) =>
  GET<ParentTreePathItemType[]>('/core/template/paths', { parentId });

export const getTemplateById = (id: string) => GET<TemplateItemType>(`/core/template/detail?id=${id}`);

export const postCreateTemplate = (data: CreateTemplateParams) =>
  POST<string>(`/core/template/create`, data);

export const putTemplateById = (data: TemplateUpdateBody) => PUT<void>(`/core/template/update`, data);

export const delTemplateById = (id: string) => DELETE(`/core/template/delete?id=${id}`);

export const postWebsiteSync = (data: PostWebsiteSyncParams) =>
  POST(`/proApi/core/template/websiteSync`, data, {
    timeout: 600000
  }).catch();

/* ============================= collections ==================================== */
export const getTemplateCollections = (data: GetTemplateCollectionsProps) =>
  POST<PagingData<TemplateCollectionsListItemType>>(`/core/template/collection/list`, data);
export const getTemplateCollectionPathById = (parentId: string) =>
  GET<ParentTreePathItemType[]>(`/core/template/collection/paths`, { parentId });
export const getTemplateCollectionById = (id: string) =>
  GET<TemplateCollectionItemType>(`/core/template/collection/detail`, { id });
export const postTemplateCollection = (data: CreateTemplateCollectionParams) =>
  POST<string>(`/core/template/collection/create`, data);
export const postCreateTemplateLinkCollection = (data: LinkCreateTemplateCollectionParams) =>
  POST<{ collectionId: string }>(`/core/template/collection/create/link`, data);

export const putTemplateCollectionById = (data: UpdateTemplateCollectionParams) =>
  POST(`/core/template/collection/update`, data);
export const delTemplateCollectionById = (params: { id: string }) =>
  DELETE(`/core/template/collection/delete`, params);
export const postLinkCollectionSync = (collectionId: string) =>
  POST<`${TemplateCollectionSyncResultEnum}`>(`/core/template/collection/sync/link`, {
    collectionId
  });

/* =============================== data ==================================== */
/* get template list */
export const getTemplateDataList = (data: GetTemplateDataListProps) =>
  POST(`/core/template/data/list`, data);

export const getTemplateDataItemById = (id: string) =>
  GET<TemplateDataItemType>(`/core/template/data/detail`, { id });

/**
 * push data to training queue
 */
export const postChunks2Template = (data: PushTemplateDataProps) =>
  POST<PushTemplateDataResponse>(`/core/template/data/pushData`, data);

/**
 * insert one data to template (immediately insert)
 */
export const postInsertData2Template = (data: InsertOneTemplateDataProps) =>
  POST<string>(`/core/template/data/insertData`, data);

/**
 * update one templateData by id
 */
export const putTemplateDataById = (data: UpdateTemplateDataProps) =>
  PUT('/core/template/data/update', data);
/**
 * 删除一条知识库数据
 */
export const delOneTemplateDataById = (id: string) =>
  DELETE<string>(`/core/template/data/delete`, { id });

/* ================ training ==================== */
/* get length of system training queue */
export const getTrainingQueueLen = (data: GetTrainingQueueProps) =>
  GET<GetTrainingQueueResponse>(`/core/template/training/getQueueLen`, data);

/* ================== file ======================== */
export const getFileViewUrl = (fileId: string) =>
  GET<string>('/core/template/file/getPreviewUrl', { fileId });
