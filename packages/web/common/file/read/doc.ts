import { loadFile2Buffer } from '../utils';
import * as pdfjsLib from 'pdfjs-dist';
// 假设FastAPI服务运行在 http://localhost:8000

let ipAddress;
// 得到getBackendConfig方法中response.url
if (typeof window !== 'undefined') {
  let thisurl = window.location.href;

  // 考虑localhost的情况
  if (thisurl.indexOf('localhost') > -1) {
    ipAddress = 'localhost';
  } else {
    const matchResult = thisurl.match(/http:\/\/(\d+\.\d+\.\d+\.\d+)/);
    if (matchResult && matchResult[1]) {
      ipAddress = matchResult[1];
    } else {
      // 如果没有匹配到 IP 地址，可以提供默认值或处理异常情况
      ipAddress = 'localhost';
    }
  }
  console.log('url:', ipAddress);
}

const use_ip = ipAddress;
const apiUrl1 = 'http://' + use_ip + ':3088/api/convert2'; // doc和wps的
const apiUrl2 = 'http://' + use_ip + ':3089/api/convert2'; // ofd的
type TokenType = {
  str: string;
  dir: string;
  width: number;
  height: number;
  transform: number[];
  fontName: string;
  hasEOL: boolean;
};

export const readDocContent = async ({ file }: { file: File }) => {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.js';
  const readPDFPage = async (doc: any, pageNo: number) => {
    const page = await doc.getPage(pageNo);
    const tokenizedText = await page.getTextContent();

    const viewport = page.getViewport({ scale: 1 });
    const pageHeight = viewport.height;
    const headerThreshold = pageHeight * 0.95;
    const footerThreshold = pageHeight * 0.05;

    const pageTexts: TokenType[] = tokenizedText.items.filter((token: TokenType) => {
      return (
        !token.transform ||
        (token.transform[5] < headerThreshold && token.transform[5] > footerThreshold)
      );
    });

    // concat empty string 'hasEOL'
    for (let i = 0; i < pageTexts.length; i++) {
      const item = pageTexts[i];
      if (item.str === '' && pageTexts[i - 1]) {
        pageTexts[i - 1].hasEOL = item.hasEOL;
        pageTexts.splice(i, 1);
        i--;
      }
    }

    page.cleanup();

    return pageTexts
      .map((token) => {
        const paragraphEnd = token.hasEOL && /([。？！.?!\n\r]|(\r\n))$/.test(token.str);

        return paragraphEnd ? `${token.str}\n` : token.str;
      })
      .join('');
  };

  if (file) {
    try {
      console.log('apiUrl', file.name, file.type);
      const arrayBuffer = await loadFile2Buffer({ file }); // ArrayBuffer数据

      // 将ArrayBuffer转换为Base64字符串
      const base64String = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // 构建请求体为JSON格式，包含type和base64数据
      const requestBody = {
        file_name: file.name,
        data: base64String
      };
      let apiUrl = apiUrl1;
      //  判断后缀
      if (file.name.endsWith('.ofd')) {
        apiUrl = apiUrl2;
      }
      // JSON.stringify将请求体对象转换为JSON字符串
      const bodyAsJsonString = JSON.stringify(requestBody);
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain'
          },
          body: bodyAsJsonString // 将JSON字符串作为请求体
        });

        const data = await response.json();
        let binaryString = atob(data.pdf_file);

        // 创建适当大小的ArrayBuffer
        let len = binaryString.length;
        let buffer = new ArrayBuffer(len);
        let view = new Uint8Array(buffer);

        // 将每个字符转换为字节并填充到ArrayBuffer中
        for (let i = 0; i < len; i++) {
          view[i] = binaryString.charCodeAt(i);
        }
        const doc = await pdfjsLib.getDocument(buffer).promise;
        const pageTextPromises = [];
        for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
          console.log(`Processing page ${pageNo}`);
          pageTextPromises.push(readPDFPage(doc, pageNo));
        }
        const pageTexts = await Promise.all(pageTextPromises);
        console.log('pageTexts', pageTexts);
        return {
          rawText: pageTexts.join('')
        };

        // resolve(buffer);
      } catch (postRequestError) {
        console.error('An error occurred during the POST request:', postRequestError);
      }
    } catch (loadFileError) {
      console.error('An error occurred while loading the file:', loadFileError);
    }
  } else {
    // 如果没有文件，可以添加一个错误处理
    console.error('No file selected.');
  }
};
