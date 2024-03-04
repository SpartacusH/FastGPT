import type { PushTemplateDataChunkProps } from '@fastgpt/global/core/template/api';
import { TrainingModeEnum } from '@fastgpt/global/core/template/constants';
import { ImportProcessWayEnum } from './constants';
import { UseFormReturn } from 'react-hook-form';

export type ImportDataComponentProps = {
  activeStep: number;
  goToNext: () => void;
};

export type ImportSourceItemType = {
  id: string;
  rawText: string;
  chunks: PushTemplateDataChunkProps[];
  chunkChars: number;
  sourceFolderPath?: string;
  sourceName: string;
  sourceSize?: string;
  icon: string;
  metadata?: Record<string, any>;
  errorMsg?: string;

  // source
  file?: File;
  link?: string;
};

export type ImportSourceParamsType = UseFormReturn<
  {
    chunkSize: number;
    chunkOverlapRatio: number;
    customSplitChar: string;
    prompt: string;
    mode: TrainingModeEnum;
    way: ImportProcessWayEnum;
  },
  any
>;
