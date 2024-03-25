import { app, dialog, ipcMain } from "electron";
import {
  getParsedAndValidatedResumeData,
  haltFinalSave,
  performFinalSave,
  showOpenDialog,
} from "./utils";

ipcMain.handle(
  "dialog-open",
  async (e, openDialogParams: OpenDialogParams) => await showOpenDialog(openDialogParams),
);

ipcMain.handle("get-downloads-directory", (e): string => app.getPath("downloads"));

ipcMain.handle("halt-final-submit", (e) => haltFinalSave());

ipcMain.handle(
  "handle-final-submit",
  async (e, submitData: SubmitData, originalXlsx: string) =>
    await performFinalSave(submitData, originalXlsx),
);

ipcMain.handle(
  "get-parsed-and-validated-resume-data",
  (e, resumeFile: string): ParsedAndValidatedResumeData => getParsedAndValidatedResumeData(resumeFile),
);
