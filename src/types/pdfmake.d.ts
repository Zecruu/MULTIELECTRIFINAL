declare module 'pdfmake/build/pdfmake' {
  type PdfDocProxy = { download: (filename?: string) => void };
  const pdfMake: { vfs?: Record<string, string>; createPdf: (docDefinition: object) => PdfDocProxy };
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const pdfFonts: { pdfMake: { vfs: Record<string, string> } };
  export default pdfFonts;
}

