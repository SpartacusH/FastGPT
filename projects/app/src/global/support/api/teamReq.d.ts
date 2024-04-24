import {
  TrainingModeEnum,
  DatasetCollectionTypeEnum,
  DatasetTypeEnum
} from '@fastgpt/global/core/dataset/constants';
import type { RequestPaging } from '@/types';
import { TrainingModeEnum } from '@fastgpt/global/core/dataset/constants';
import type { SearchTestItemType } from '@/types/core/dataset';
import { UploadChunkItemType } from '@fastgpt/global/core/dataset/type';
import { DatasetCollectionSchemaType } from '@fastgpt/global/core/dataset/type';
import { PermissionTypeEnum } from '@fastgpt/global/support/permission/constant';
import type { LLMModelItemType } from '@fastgpt/global/core/ai/model.d';

/* ===== dataset ===== */

/* ======= Team =========== */
export type GetTeamProps = RequestPaging & {
  status: string;
};
