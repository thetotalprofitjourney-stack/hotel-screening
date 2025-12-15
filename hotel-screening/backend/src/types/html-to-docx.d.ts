declare module 'html-to-docx';

declare module 'html-docx-js' {
  function asBlob(html: string, options?: any): any;
  export = { asBlob };
}
