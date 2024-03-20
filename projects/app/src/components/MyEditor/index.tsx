import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import React, { useEffect, useState } from 'react';
import '@wangeditor/editor/dist/css/style.css';
type Props = {};

const MyEditor = ({ html, setHtml }: { html: string; setHtml: () => void }) => {
  //const { html, setHtml } = props;
  const [editor, setEditor] = useState(null);

  const editorConfig = {
    placeholder: '富文本编辑器加载完成...'
  };
  // 及时销毁 editor ，重要！
  useEffect(() => {
    console.log('editor', editor);
    return () => {
      if (editor == null) return;
      // @ts-ignore
      editor.destroy();
      setEditor(null);
    };
  }, [editor]);
  useEffect(() => {
    console.log('html', html);
  }, [html]);
  // @ts-ignore
  return (
    <>
      <Toolbar
        editor={editor}
        defaultConfig={{}}
        mode="default"
        style={{ borderBottom: '1px solid #ccc' }}
      />
      <Editor
        defaultConfig={editorConfig}
        value={html}
        // @ts-ignore
        onCreated={setEditor}
        // @ts-ignore
        onChange={(editor) => setHtml(editor.getHtml())}
        mode="default"
        style={{ height: 'calc(100vh - 212px)', width: '32vw', overflowY: 'hidden' }}
      />
    </>
  );
};
export default MyEditor;
