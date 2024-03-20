import { RESUME_FILE_EXTENSION_PREFIX } from "./constants";
import _ from "lodash";

export const checkIfResumeFile = (filePath: string): boolean => {
  return _.nth(filePath.split("."), -2) === RESUME_FILE_EXTENSION_PREFIX;
};
