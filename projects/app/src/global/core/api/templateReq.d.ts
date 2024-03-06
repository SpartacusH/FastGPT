import {
  TrainingModeEnum,
  TemplateCollectionTypeEnum,
  TemplateTypeEnum
} from '@fastgpt/global/core/template/constants';
import type { RequestPaging } from '@/types';
import { TrainingModeEnum } from '@fastgpt/global/core/template/constants';
import type { SearchTestItemType } from '@/types/core/template';
import { UploadChunkItemType } from '@fastgpt/global/core/template/type';
import { TemplateCollectionSchemaType } from '@fastgpt/global/core/template/type';
import { PermissionTypeEnum } from '@fastgpt/global/support/permission/constant';
import type { LLMModelItemType } from '@fastgpt/global/core/ai/model.d';

/* ===== template ===== */

/* ======= collections =========== */
export type GetTemplateCollectionsProps = RequestPaging & {
  templateId: string;
  parentId?: string;
  searchText?: string;
  simple?: boolean;
  selectFolder?: boolean;
};

export type UpdateTemplateCollectionParams = {
  id: string;
  parentId?: string;
  name?: string;
};

/* ==== data ===== */
export type GetTemplateDataListProps = RequestPaging & {
  searchText?: string;
  collectionId: string;
};
