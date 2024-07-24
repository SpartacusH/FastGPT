import mammoth from 'mammoth';
import TurndownService from 'turndown';
// import { htmlToMarkdown } from '../../../../service/common/string/markdown';
import { markdownProcess } from '@fastgpt/global/common/string/markdown';

/**
 * read docx to markdown
 */
// 将 HTML 转换为 Markdown
const htmlToMarkdown = (html:string) => {
  const turndownService = new TurndownService();
  return turndownService.turndown(html);
};

export const readDocxFile = async ({
    file,
    uploadImgController
  }: {
    file: File;
    uploadImgController?: (base64: string) => Promise<string>;
  }): Promise<{ rawText: string }> => {
    try{
       const arrayBuffer = await file.arrayBuffer();
      //  console.log('ArrayBuffer:', arrayBuffer);
        // 将 ArrayBuffer 转换为 HTML
       const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
      //  console.log('html:', html);
       const md =  htmlToMarkdown(html);
      //  console.log("md:",md);
       const simpleMd = await markdownProcess({
           rawText: md,
           uploadImgController
       });
      //  console.log("rawText:",simpleMd)
      // 手动释放内存
      return { rawText: simpleMd };

    }catch(error){ 
        console.error('Error reading DOCX file:', error);
       return { rawText: '' };
    }
}

