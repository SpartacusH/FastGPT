import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import React, { useEffect, useState } from 'react';
import '@wangeditor/editor/dist/css/style.css';
export default function (props) {
  const { html, setHtml } = props;
  const [editor, setEditor] = useState(null);
  // const [html, setHtml] = useState(null);

  const editorConfig = {
    placeholder: '富文本编辑器加载完成...'
  };
  // 及时销毁 editor ，重要！
  useEffect(() => {
    console.log('editor', editor);
    return () => {
      if (editor == null) return;
      editor.destroy();
      setEditor(null);
    };
  }, [editor]);
  useEffect(() => {
    console.log('html', html);
  }, [html]);
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
        onCreated={setEditor}
        onChange={(editor) => setHtml(editor.getHtml())}
        mode="default"
        style={{ height: 'calc(100vh - 212px)', width: '32vw', overflowY: 'hidden' }}
      />
    </>
  );
}
