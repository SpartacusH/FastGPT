import type { TemplateDataIndexItemType, TemplateDataSchemaType } from './type';

export type CreateTemplateDataProps = {
  teamId: string;
  tmbId: string;
  templateId: string;
  collectionId: string;
  chunkIndex?: number;
  q: string;
  a?: string;
  indexes?: Omit<TemplateDataIndexItemType, 'dataId'>[];
};

export type UpdateTemplateDataProps = {
  dataId: string;
  q?: string;
  a?: string;
  indexes?: (Omit<TemplateDataIndexItemType, 'dataId'> & {
    dataId?: string; // pg data id
  })[];
};

export type PatchIndexesProps = {
  type: 'create' | 'update' | 'delete' | 'unChange';
  index: Omit<TemplateDataIndexItemType, 'dataId'> & {
    dataId?: string;
  };
};
