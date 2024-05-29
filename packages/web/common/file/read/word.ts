import { markdownProcess } from '@fastgpt/global/common/string/markdown';
import { htmlStr2Md } from '../../string/markdown';
import { loadFile2Buffer } from '../utils';
import mammoth from 'mammoth';

export const readWordFile = async ({
  file,
  uploadImgController
}: {
  file: File;
  uploadImgController?: (base64: string) => Promise<string>;
}) => {
  let ipAddress;
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
  const apiUrl = 'http://' + use_ip + ':3087/api/convert2'; // doc和wps的
  const arrayBuffer = await loadFile2Buffer({ file }); // ArrayBuffer数据
  // const buffer = await loadFile2Buffer({file});
  // 将ArrayBuffer转换为Base64字符串
  const base64String = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  // 构建请求体为JSON格式，包含type和base64数据
  const requestBody = {
    file_name: file.name,
    data: base64String
  };
  // JSON.stringify将请求体对象转换为JSON字符串
  const bodyAsJsonString = JSON.stringify(requestBody);

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

  const { value: html } = await mammoth.convertToHtml({
    arrayBuffer: buffer
  });
  const md = htmlStr2Md(html);

  const rawText = await markdownProcess({
    rawText: md,
    uploadImgController: uploadImgController
  });

  return {
    rawText
  };
};
