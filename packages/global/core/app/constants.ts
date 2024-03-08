export enum AppTypeEnum {
  simple = 'simple',
  advanced = 'advanced',
  report = 'report',
  video = 'video'
}
export const AppTypeMap = {
  [AppTypeEnum.simple]: {
    label: 'simple'
  },
  [AppTypeEnum.advanced]: {
    label: 'advanced'
  },
  [AppTypeEnum.report]: {
    label: 'report'
  },
  [AppTypeEnum.video]: {
    label: 'video'
  }
};
