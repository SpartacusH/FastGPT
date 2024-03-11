export enum ReportTypeEnum {
  simple = 'simple',
  advanced = 'advanced',
  report = 'report'
}
export const ReportTypeMap = {
  [ReportTypeEnum.simple]: {
    label: 'simple'
  },
  [ReportTypeEnum.advanced]: {
    label: 'advanced'
  },
  [ReportTypeEnum.report]: {
    label: 'report'
  }
};
