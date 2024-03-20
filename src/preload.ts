import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  openXlsxDialog: (defaultPath: string): Promise<string> =>
    ipcRenderer.invoke("dialog-open", { defaultPath, type: "xls/xlsx" }),

  openDirectoryDialog: (defaultPath: string): Promise<string> =>
    ipcRenderer.invoke("dialog-open", { defaultPath, type: "directory" }),

  getDownloadsDirectory: (): Promise<string> => ipcRenderer.invoke("get-downloads-directory"),

  haltFinalSubmit: (): Promise<void> => ipcRenderer.invoke("halt-final-submit"),

  handleFinalSubmit: (submitData: SubmitData, originalXlsx: string): Promise<Done> =>
    ipcRenderer.invoke("handle-final-submit", submitData, originalXlsx),

  getParsedAndValidatedResumeData: (resumeFile: string): Promise<ParsedAndValidatedResumeData> =>
    ipcRenderer.invoke("get-parsed-and-validated-resume-data", resumeFile),
});
