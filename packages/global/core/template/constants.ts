/* ------------ template -------------- */
export enum TemplateTypeEnum {
  folder = 'folder',
  template = 'template',
  websiteTemplate = 'websiteTemplate' // depp link
}
export const TemplateTypeMap = {
  [TemplateTypeEnum.folder]: {
    icon: 'common/folderFill',
    label: 'core.template.Folder Template',
    collectionLabel: 'common.Folder'
  },
  [TemplateTypeEnum.template]: {
    icon: 'core/template/commonTemplate',
    label: 'core.template.Common Template',
    collectionLabel: 'common.File'
  },
  [TemplateTypeEnum.websiteTemplate]: {
    icon: 'core/template/websiteTemplate',
    label: 'core.template.Website Template',
    collectionLabel: 'common.Website'
  }
};

export enum TemplateStatusEnum {
  active = 'active',
  syncing = 'syncing'
}
export const TemplateStatusMap = {
  [TemplateStatusEnum.active]: {
    label: 'core.template.status.active'
  },
  [TemplateStatusEnum.syncing]: {
    label: 'core.template.status.syncing'
  }
};

/* ------------ collection -------------- */
export enum TemplateCollectionTypeEnum {
  folder = 'folder',
  file = 'file',
  link = 'link', // one link
  virtual = 'virtual'
}
export const TemplateCollectionTypeMap = {
  [TemplateCollectionTypeEnum.folder]: {
    name: 'core.template.folder'
  },
  [TemplateCollectionTypeEnum.file]: {
    name: 'core.template.file'
  },
  [TemplateCollectionTypeEnum.link]: {
    name: 'core.template.link'
  },
  [TemplateCollectionTypeEnum.virtual]: {
    name: 'core.template.Manual collection'
  }
};

export enum TemplateCollectionSyncResultEnum {
  sameRaw = 'sameRaw',
  success = 'success'
}
export const TemplateCollectionSyncResultMap = {
  [TemplateCollectionSyncResultEnum.sameRaw]: {
    label: 'core.template.collection.sync.result.sameRaw'
  },
  [TemplateCollectionSyncResultEnum.success]: {
    label: 'core.template.collection.sync.result.success'
  }
};

/* ------------ data -------------- */
export enum TemplateDataIndexTypeEnum {
  chunk = 'chunk',
  qa = 'qa',
  summary = 'summary',
  hypothetical = 'hypothetical',
  custom = 'custom'
}
export const TemplateDataIndexTypeMap = {
  [TemplateDataIndexTypeEnum.chunk]: {
    name: 'template.data.indexes.chunk'
  },
  [TemplateDataIndexTypeEnum.summary]: {
    name: 'template.data.indexes.summary'
  },
  [TemplateDataIndexTypeEnum.hypothetical]: {
    name: 'template.data.indexes.hypothetical'
  },
  [TemplateDataIndexTypeEnum.qa]: {
    name: 'template.data.indexes.qa'
  },
  [TemplateDataIndexTypeEnum.custom]: {
    name: 'template.data.indexes.custom'
  }
};

/* ------------ training -------------- */
export enum TrainingModeEnum {
  chunk = 'chunk',
  qa = 'qa'
}

export const TrainingTypeMap = {
  [TrainingModeEnum.chunk]: {
    label: 'core.template.training.Chunk mode',
    tooltip: 'core.template.import.Chunk Split Tip'
  },
  [TrainingModeEnum.qa]: {
    label: 'core.template.training.QA mode',
    tooltip: 'core.template.import.QA Import Tip'
  }
};

/* ------------ search -------------- */
export enum TemplateSearchModeEnum {
  embedding = 'embedding',
  fullTextRecall = 'fullTextRecall',
  mixedRecall = 'mixedRecall'
}

export const TemplateSearchModeMap = {
  [TemplateSearchModeEnum.embedding]: {
    icon: 'core/template/modeEmbedding',
    title: 'core.template.search.mode.embedding',
    desc: 'core.template.search.mode.embedding desc',
    value: TemplateSearchModeEnum.embedding
  },
  [TemplateSearchModeEnum.fullTextRecall]: {
    icon: 'core/template/fullTextRecall',
    title: 'core.template.search.mode.fullTextRecall',
    desc: 'core.template.search.mode.fullTextRecall desc',
    value: TemplateSearchModeEnum.fullTextRecall
  },
  [TemplateSearchModeEnum.mixedRecall]: {
    icon: 'core/template/mixedRecall',
    title: 'core.template.search.mode.mixedRecall',
    desc: 'core.template.search.mode.mixedRecall desc',
    value: TemplateSearchModeEnum.mixedRecall
  }
};

export enum SearchScoreTypeEnum {
  embedding = 'embedding',
  fullText = 'fullText',
  reRank = 'reRank',
  rrf = 'rrf'
}
export const SearchScoreTypeMap = {
  [SearchScoreTypeEnum.embedding]: {
    label: 'core.template.search.score.embedding',
    desc: 'core.template.search.score.embedding desc',
    showScore: true
  },
  [SearchScoreTypeEnum.fullText]: {
    label: 'core.template.search.score.fullText',
    desc: 'core.template.search.score.fullText desc',
    showScore: false
  },
  [SearchScoreTypeEnum.reRank]: {
    label: 'core.template.search.score.reRank',
    desc: 'core.template.search.score.reRank desc',
    showScore: true
  },
  [SearchScoreTypeEnum.rrf]: {
    label: 'core.template.search.score.rrf',
    desc: 'core.template.search.score.rrf desc',
    showScore: false
  }
};

export const FolderIcon = 'file/fill/folder';
export const FolderImgUrl = '/imgs/files/folder.svg';

export const CustomCollectionIcon = 'common/linkBlue';
export const LinkCollectionIcon = 'common/linkBlue';
