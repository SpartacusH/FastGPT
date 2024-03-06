import { ErrType } from '../errorCode';

/* template: 501000 */
export enum TemplateErrEnum {
  unAuthTemplate = 'unAuthTemplate',
  unCreateCollection = 'unCreateCollection',
  unAuthTemplateCollection = 'unAuthTemplateCollection',
  unAuthTemplateData = 'unAuthTemplateData',
  unAuthTemplateFile = 'unAuthTemplateFile',

  unLinkCollection = 'unLinkCollection'
}
const templateErr = [
  {
    statusText: TemplateErrEnum.unAuthTemplate,
    message: 'core.template.error.unAuthTemplate'
  },
  {
    statusText: TemplateErrEnum.unAuthTemplateCollection,
    message: 'core.template.error.unAuthTemplateCollection'
  },
  {
    statusText: TemplateErrEnum.unAuthTemplateData,
    message: 'core.template.error.unAuthTemplateData'
  },
  {
    statusText: TemplateErrEnum.unAuthTemplateFile,
    message: 'core.template.error.unAuthTemplateFile'
  },
  {
    statusText: TemplateErrEnum.unCreateCollection,
    message: 'core.template.error.unCreateCollection'
  },
  {
    statusText: TemplateErrEnum.unLinkCollection,
    message: 'core.template.error.unLinkCollection'
  }
];
export default templateErr.reduce((acc, cur, index) => {
  return {
    ...acc,
    [cur.statusText]: {
      code: 501000 + index,
      statusText: cur.statusText,
      message: cur.message,
      data: null
    }
  };
}, {} as ErrType<`${TemplateErrEnum}`>);
