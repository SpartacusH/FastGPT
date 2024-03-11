import { ErrType } from '../errorCode';

/* dataset: 502000 */
export enum ReportErrEnum {
  unExist = 'unExist',
  unAuthReport = 'unAuthReport'
}
const reportErrList = [
  {
    statusText: ReportErrEnum.unExist,
    message: '应用不存在'
  },
  {
    statusText: ReportErrEnum.unAuthReport,
    message: '无权操作该应用'
  }
];
export default reportErrList.reduce((acc, cur, index) => {
  return {
    ...acc,
    [cur.statusText]: {
      code: 502000 + index,
      statusText: cur.statusText,
      message: cur.message,
      data: null
    }
  };
}, {} as ErrType<`${ReportErrEnum}`>);
