export enum BucketNameEnum {
  dataset = 'dataset',
  template= 'template'
}
export const bucketNameMap = {
  [BucketNameEnum.dataset]: {
    label: 'common.file.bucket.dataset'
  },
  [BucketNameEnum.template]: {
    label: 'common.file.bucket.template'
  }
};

export const FileBaseUrl = '/api/common/file/read';
