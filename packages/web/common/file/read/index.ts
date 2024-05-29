import { loadFile2Buffer } from '../utils';
import { readCsvContent } from './csv';
import { readHtmlFile } from './html';
import { readMdFile } from './md';
import { readPdfFile } from './pdf';
import { readDocContent } from './doc';
import { readFileRawText } from './rawText';
import { readWordFile } from './word';

export const readFileRawContent = async ({
  file,
  uploadBase64Controller
}: {
  file: File;
  uploadBase64Controller?: (base64: string) => Promise<string>;
}): Promise<{
  rawText: string;
}> => {
  const extension = file?.name?.split('.')?.pop()?.toLowerCase();

  switch (extension) {
    case 'txt':
      console.log('read txt file');

      return readFileRawText(file);
    case 'md':
      return readMdFile({
        file,
        uploadImgController: uploadBase64Controller
      });
    case 'html':
      return readHtmlFile({
        file,
        uploadImgController: uploadBase64Controller
      });
    case 'csv':
      return readCsvContent({ file });
    // case 'pdf':
    //   const pdf = await loadFile2Buffer({ file });
    //   // 判断是否是扫描版pdf的方法
    //   return readPdfFile({ pdf });
    case 'pdf':
    case 'ofd':
    case 'doc':
    case 'wps':
    case 'docx':
      // @ts-ignore
      return readDocContent({ file });
    // case 'docx':
    //   return readWordFile({
    //     file,
    //     uploadImgController: uploadBase64Controller
    //   });

    default:
      return {
        rawText: ''
      };
  }
};
