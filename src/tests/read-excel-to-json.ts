import { getGroupedAnnotationsFromExcel, readExcelToJSON } from "../utils";

// console.log(readExcelToJSON("/home/salman/Downloads/xlsx/5.xlsx"));
console.log(
  JSON.stringify(
    getGroupedAnnotationsFromExcel({
      inputXlsx: "/home/salman/Downloads/9.xlsx",
      numAnnotationsPerId: "4",
      unidentifiedEncounters: true,
    }),
    null,
    4,
  ),
);
