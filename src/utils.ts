import sharp from "sharp";
import XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import _, { wrap } from "lodash";

import { RESUME_FILE_EXTENSION_PREFIX, RESUME_INFORMATION, Viewpoint } from "./constants";
import { dialog } from "electron";
import { mainWindow } from "./index";

const UNIDENTIFIED_ANNOTATIONS_FOLDER = "Unidentified_annotations";

const cropAndSaveImage = async (
  imageBuffer: ArrayBuffer,
  cropRectangle: number[],
  outputPath: string,
) => {
  return await sharp(imageBuffer)
    .extract({
      left: cropRectangle[0],
      top: cropRectangle[1],
      width: cropRectangle[2],
      height: cropRectangle[3],
    })
    .withMetadata()
    .toFile(outputPath);
};

const downloadImageToBuffer = async (imageUrl: string) => {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to download image, status ${response.status}`);
  }

  return await response.arrayBuffer();
};

const downloadCropAndSaveImage = async (
  imageUrl: string,
  cropRectangle: number[],
  outputPath: string,
) => {
  console.log({ imageUrl, cropRectangle, outputPath });
  const buffer = await downloadImageToBuffer(imageUrl);
  await cropAndSaveImage(buffer, cropRectangle, outputPath);
};

const readExcelToJSON = ({ filePath, sheetNum }: { filePath: string; sheetNum: number }): any[] => {
  const workbook: XLSX.WorkBook = XLSX.readFile(filePath);
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[sheetNum]], { defval: "" });
};

const shortlistAnnotations = (
  inputAnnotationRows: AnnotationRow[],
  maxNum: string,
): AnnotationRow[] => {
  /*
   * To be shortlisted based on the following criteria:
   *   -> value of maxNum
   *   -> viewpoint of individual annotations
   *   -> no duplicates
   *
   * Q: What is an x-similar viewpoint?
   * A: When any of the straight left/right/front/back viewpoints aren't available,
   *    then replace with a similar viewpoint for each, e.g.:
   *       left => frontleft/backleft
   *       right => frontright/upright
   *       front => frontright/frontup
   *       back => backleft/backup
   *       up => upleft/upright
   *
   * 1:
   *   left
   *   if not available, then right,
   *   if not available, then left-similar
   *   if not available, then right-similar
   *   If not available, then any other viewpoint available
   *
   * 2:
   *   left + right
   *   if any not available, then respectively replace with a similar viewpoint of each
   *   if any still not available, then choose any other viewpoint(s) available to attempt to complete the total of 2
   *
   * 3:
   *   left + right + front
   *   if any not available, then respectively replace with a similar viewpoint of each
   *   if any still not available, then choose any other viewpoint(s) available to attempt to complete the total of 3
   *
   * 4:
   *   left + right + front + back
   *   if any not available, then respectively replace with a similar viewpoint of each
   *   if any still not available, then choose any other viewpoint(s) available to attempt to complete the total of 4
   *
   * 5:
   *   left + right + front + back + up
   *   if any not available, then respectively replace with a similar viewpoint of each
   *   if any still not available, then choose any other viewpoint(s) available to attempt to complete the total of 5
   *
   *
   * 6 and 6+:
   *   prefer to fill up the slots on left + right + front + back + up (in this order)
   *   if any not available, then respectively replace with a similar viewpoint of each
   *   if any still not available, then choose any other viewpoint(s) available to attempt to complete the required total at random
   */

  const maxNumInt = _.parseInt(maxNum);
  if (maxNum === "all" || maxNumInt >= inputAnnotationRows.length) {
    return inputAnnotationRows;
  }

  const pullAnnotationRow = (
    match: "any" | "similar" | "exact",
    viewpoint?: Viewpoint,
  ): AnnotationRow | undefined => {
    // mutates inputAnnotationRows

    const indexToPull = _.findIndex(inputAnnotationRows, (annotationRow: AnnotationRow) => {
      if (match === "any") return true;
      if (match === "similar") return annotationRow["Annotation0.ViewPoint"].includes(viewpoint);
      if (match === "exact") return annotationRow["Annotation0.ViewPoint"] === viewpoint;
    });

    if (indexToPull === -1) {
      return undefined;
    }

    return _.first(_.pullAt(inputAnnotationRows, [indexToPull]));
  };

  const pullAnnotationRowPreference1Wise = (viewpoint1: Viewpoint, viewpoint2: Viewpoint) => {
    return (
      pullAnnotationRow("exact", viewpoint1) ||
      pullAnnotationRow("exact", viewpoint2) ||
      pullAnnotationRow("similar", viewpoint1) ||
      pullAnnotationRow("similar", viewpoint2) ||
      pullAnnotationRow("any")
    );
  };

  const pullAnnotationRowPreference2Wise = (viewpoint: Viewpoint) => {
    return (
      pullAnnotationRow("exact", viewpoint) ||
      pullAnnotationRow("similar", viewpoint) ||
      pullAnnotationRow("any")
    );
  };

  if (maxNumInt === 1) {
    return [pullAnnotationRowPreference1Wise(Viewpoint.LEFT, Viewpoint.RIGHT)];
  } else if (maxNumInt > 1) {
    const viewpointPreferenceList: (Viewpoint | "any")[] = [
      Viewpoint.LEFT,
      Viewpoint.RIGHT,
      Viewpoint.FRONT,
      Viewpoint.BACK,
      Viewpoint.UP,
    ];

    const numAny: number = maxNumInt - viewpointPreferenceList.length;
    const anyArray: "any"[] = numAny > 0 ? _.fill(Array(numAny), "any") : [];

    return _.concat(viewpointPreferenceList, anyArray)
      .slice(0, maxNumInt)
      .map((viewpoint: Viewpoint | "any"): AnnotationRow => {
        return viewpoint === "any"
          ? pullAnnotationRow("any")
          : pullAnnotationRowPreference2Wise(viewpoint);
      });
  }
};

const getGroupedAnnotationsFromExcel = ({
  inputXlsx,
  numAnnotationsPerId,
  unidentifiedEncounters,
  skipUnmatched = true,
}: {
  inputXlsx: string;
  numAnnotationsPerId: string;
  unidentifiedEncounters: boolean;
  skipUnmatched?: boolean;
}): AnnotationsWithId[] => {
  const ungroupedJSON = readExcelToJSON({ filePath: inputXlsx, sheetNum: 0 });
  const processedRows: AnnotationRow[] = [];


  ungroupedJSON.forEach((originalRow) => {
    const maxAnnotationIndex = Object.keys(originalRow)
      .filter((key) => key.startsWith("Annotation") && key.endsWith("MatchAgainst"))
      .reduce((maxIndex, currentKey) => {
        const currentIndex = parseInt(currentKey.match(/Annotation(\d+).MatchAgainst/)?.[1] || "0", 10);
        return Math.max(maxIndex, currentIndex);
      }, 0);
  
    for (let i = 0; i <= maxAnnotationIndex; i++) {
      
      if (
        originalRow[`Annotation${i}.MatchAgainst`] !== 'true' 
        || originalRow[`Annotation${i}.ViewPoint`] ==='' 
        || originalRow[`Encounter.mediaAsset${i}.imageUrl`] ===''
      )
      {
        continue;
      }
      
      const newRow = { ...originalRow }; // Clone the original row

      // Replace Annotation0.MatchAgainst with current AnnotationX.MatchAgainst
      newRow["Annotation0.MatchAgainst"] = originalRow[`Annotation${i}.MatchAgainst`];
      newRow["Encounter.mediaAsset0"] = originalRow[`Encounter.mediaAsset${i}`];
      newRow["Annotation0.ViewPoint"] = originalRow[`Annotation${i}.ViewPoint`];
      newRow["Encounter.mediaAsset0.imageUrl"] = originalRow[`Encounter.mediaAsset${i}.imageUrl`];
      newRow["Annotation0.bbox"] = originalRow[`Annotation${i}.bbox`];

      // Handle case if Name0.value not in newRow
      if (newRow["Name0.value"] === undefined) {
        newRow["Name0.value"] = UNIDENTIFIED_ANNOTATIONS_FOLDER;
      }
      else{
        newRow["Name0.value"] = newRow["Name0.value"].trim() === "" ? UNIDENTIFIED_ANNOTATIONS_FOLDER : newRow["Name0.value"].trim();
      }
  
      processedRows.push(newRow);
    }
  });

  // TODO: validate at runtime that ungroupedJSON is really of type AnnotationRow[], maybe using something like https://github.com/gcanti/io-ts

  return Object.entries(_.groupBy(processedRows, "Name0.value"))
    .filter(
      ([individualId, groups]) =>
        unidentifiedEncounters || individualId !== UNIDENTIFIED_ANNOTATIONS_FOLDER,
    )
    .map(([individualId, groups]): AnnotationsWithId => {
      return {
        "Name0.value": individualId,
        annotationRows: shortlistAnnotations(groups, numAnnotationsPerId),
      };
    });
};

let haltFinalSaveFlag = false;

const haltFinalSave = () => {
  haltFinalSaveFlag = true;
};

const performFinalSave = async (submitData: SubmitData, originalXlsx: string): Promise<Done> => {
  // if originalXlsx is truthy, then assume resume-mode

  submitData = _.pick(submitData, [
    "downloadRoot",
    "inputXlsx",
    "unidentifiedEncounters",
    "numAnnotationsPerId",
  ]);
  haltFinalSaveFlag = false;

  const filenameToBaseErrorFileAndFolderNameOn = path.basename(
    originalXlsx || submitData.inputXlsx,
  );

  const filePath = originalXlsx || submitData.inputXlsx;
  const parsedPath = path.parse(filePath);
  const filenameWithoutExtension = parsedPath.name;

  console.log({ filenameWithoutExtension });

  const wrappingFolder = path.join(submitData.downloadRoot, filenameWithoutExtension);

  console.log({ wrappingFolder });

  try {
    fs.mkdirSync(wrappingFolder, { recursive: true });
  } catch (error) {
    return { success: false, message: `Couldn't create folder: ${wrappingFolder}.` };
  }

  let annotationsWithIds: AnnotationsWithId[];
  try {
    annotationsWithIds = getGroupedAnnotationsFromExcel(submitData);
  } catch (error) {
    return { success: false, message: `Malformed excel file: ${submitData.inputXlsx}.` };
  }

  const errors: { [key: string]: AnnotationsWithId } = {}; // can be an array really but object property lookups are faster/more convenient than linear search
  for (const annotationsWithId of annotationsWithIds) {
    const individualIdFolder = path.join(wrappingFolder, annotationsWithId["Name0.value"]);

    console.log({ individualIdFolder });

    if (!haltFinalSaveFlag) {
      try {
        fs.mkdirSync(individualIdFolder, { recursive: true });
      } catch (error) {
        errors[annotationsWithId["Name0.value"]] = {
          "Name0.value": annotationsWithId["Name0.value"],
          annotationRows: annotationsWithId["annotationRows"].map(
            (annotationRow: AnnotationRow) => {
              return {
                ...annotationRow,
                wildExErrorMessage: `Couldn't create folder: ${individualIdFolder}.`,
              };
            },
          ),
        };
        continue;
      }
    }

    for (const annotationRow of annotationsWithId.annotationRows) {
      try {

        if (!haltFinalSaveFlag) {
          await downloadCropAndSaveImage(
            annotationRow["Encounter.mediaAsset0.imageUrl"],
            annotationRow["Annotation0.bbox"].match(/\d+/g).map(Number),
            path.join(
              individualIdFolder,
              `${
                annotationRow["Encounter.mediaAsset0"]
              }${path.parse(annotationRow["Encounter.mediaAsset0"]).ext}`,
            ),
          );
        } else {
          throw new Error("Canceled by user");
        }
      } catch (error) {
        const errorAnnotationRow: AnnotationRow = {
          ...annotationRow,
          wildExErrorMessage: error.message,
        };

        if (_.has(errors, annotationsWithId["Name0.value"])) {
          errors[annotationsWithId["Name0.value"]].annotationRows.push(errorAnnotationRow);
        } else {
          errors[annotationsWithId["Name0.value"]] = {
            "Name0.value": annotationsWithId["Name0.value"],
            annotationRows: [errorAnnotationRow],
          };
        }
      }
    }
  }

  const errorsExcelJSON: AnnotationRow[] = _.flatMap(Object.values(errors), "annotationRows");

  const temp: path.ParsedPath = path.parse(filenameToBaseErrorFileAndFolderNameOn);
  const errorsExcelFilePath = path.join(
    wrappingFolder,
    temp.name + "." + RESUME_FILE_EXTENSION_PREFIX + temp.ext,
  );
  fs.existsSync(errorsExcelFilePath) && fs.unlinkSync(errorsExcelFilePath); // delete the file if it already exists

  if (errorsExcelJSON.length) {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(errorsExcelJSON),
      "Search Results",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        { ...submitData, inputXlsx: originalXlsx || submitData.inputXlsx },
      ]),
      RESUME_INFORMATION,
    );
    XLSX.writeFile(workbook, errorsExcelFilePath, { compression: true });

    return {
      success: false,
      message: `${errorsExcelJSON.length} annotations couldn't be downloaded, retry with ${errorsExcelFilePath} after fixing it to resume.`,
      errorsExcelFilePath,
    };
  } else {
    return { success: true, message: "All annotations downloaded successfully." };
  }
};

const showOpenDialog = async (openDialogParams: OpenDialogParams): Promise<string> => {
  let result: Electron.OpenDialogReturnValue;

  if (openDialogParams.type === "xls/xlsx") {
    result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ name: "Microsoft Excel File", extensions: ["xls", "xlsx"] }],
      defaultPath: openDialogParams.defaultPath,
    });
  } else if (openDialogParams.type === "directory") {
    result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      defaultPath: openDialogParams.defaultPath,
    });
  }

  if (result && !result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  } else {
    return "";
  }
};

const getParsedAndValidatedResumeData = (resumeFile: string): ParsedAndValidatedResumeData => {
  try {
    return _.first(readExcelToJSON({ filePath: resumeFile, sheetNum: 1 })) as unknown as SubmitData;
  } catch (e) {
    // TODO: implement better validation
    return { errorMessage: "Invalid resume file" };
  }
};

export {
  downloadCropAndSaveImage,
  readExcelToJSON,
  getGroupedAnnotationsFromExcel,
  haltFinalSave,
  performFinalSave,
  showOpenDialog,
  getParsedAndValidatedResumeData,
};
