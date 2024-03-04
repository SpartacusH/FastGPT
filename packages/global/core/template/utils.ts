import { TrainingModeEnum, TemplateCollectionTypeEnum, TemplateDataIndexTypeEnum } from './constants';
import { getFileIcon } from '../../common/file/icon';
import { strIsLink } from '../../common/string/tools';

export function getCollectionIcon(
  type: `${TemplateCollectionTypeEnum}` = TemplateCollectionTypeEnum.file,
  name = ''
) {
  if (type === TemplateCollectionTypeEnum.folder) {
    return 'common/folderFill';
  }
  if (type === TemplateCollectionTypeEnum.link) {
    return 'common/linkBlue';
  }
  if (type === TemplateCollectionTypeEnum.virtual) {
    return 'file/fill/manual';
  }
  return getFileIcon(name);
}
export function getSourceNameIcon({
  sourceName,
  sourceId
}: {
  sourceName: string;
  sourceId?: string;
}) {
  if (strIsLink(sourceId)) {
    return 'common/linkBlue';
  }
  const fileIcon = getFileIcon(sourceName, '');
  if (fileIcon) {
    return fileIcon;
  }

  return 'file/fill/manual';
}

/* get tempalte data default index */
export function getDefaultIndex(props?: { q?: string; a?: string; dataId?: string }) {
  const { q = '', a, dataId } = props || {};
  const qaStr = `${q}\n${a}`.trim();
  return {
    defaultIndex: true,
    type: a ? TemplateDataIndexTypeEnum.qa : TemplateDataIndexTypeEnum.chunk,
    text: a ? qaStr : q,
    dataId
  };
}

export const predictDataLimitLength = (mode: `${TrainingModeEnum}`, data: any[]) => {
  if (mode === TrainingModeEnum.qa) return data.length * 20;
  return data.length;
};
