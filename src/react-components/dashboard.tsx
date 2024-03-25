import * as React from "react";
import { ChangeEvent, useEffect, useState } from "react";
import FullScreenSpinner from "./full-screen-spinner";
import {toast, ToastContainer, ToastItem} from "react-toastify";
import { Button, Form, InputGroup, Modal } from "react-bootstrap";
import * as Icon from "react-bootstrap-icons";
import * as path from "path";
import { checkIfResumeFile } from "../common";
import _ from "lodash";

const Dashboard = () => {
  const defaultNumAnnotationsPerId = "4";
  const resumeModeTooltipText = "Can't change when resuming";

  const [modalShow, setModalShow] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [resumeMode, setResumeMode] = useState(false);
  const [originalXlsx, setOriginalXlsx] = useState("");
  const [modalInfoText, setModalInfoText] = useState("");
  const [currentFormData, setCurrentFormData] = useState<
    SubmitData & { handleFinalSubmit: boolean }
  >({
    downloadRoot: "",
    inputXlsx: "",
    unidentifiedEncounters: false,
    numAnnotationsPerId: defaultNumAnnotationsPerId,
    handleFinalSubmit: false,
  });

  useEffect(() => {
    (async () => {
      const downloadsDirectory: string = await window.electron.getDownloadsDirectory();

      setCurrentFormData((previous) => ({
        ...previous,
        downloadRoot: downloadsDirectory,
      }));
    })();
  }, []);

  useEffect(() => {
    if (currentFormData.handleFinalSubmit) {
      handleFinalSubmit();
    }
  }, [currentFormData.handleFinalSubmit]);

  const handleFinalSubmit = async () => {
    setModalInfoText("Downloading...");
    setShowSpinner(true);

    setCurrentFormData((previous) => ({
      ...previous,
      handleFinalSubmit: false,
    }));

    const done: Done = await window.electron.handleFinalSubmit(currentFormData, originalXlsx);

    setShowSpinner(false);

    if (done.success) {
      const id = toast.success(done.message);
      toast.onChange((payload: ToastItem) => {
        if (payload.id === id && payload.status === "removed") {
          window.location.reload()
        }
      });
    } else {
      done.errorsExcelFilePath && (await actOnXlsx(done.errorsExcelFilePath));
      toast.error(done.message);
    }
  };

  const openXlsxDialog = async (): Promise<void> => {
    const selectedXlsx: string = await window.electron.openXlsxDialog(
      currentFormData.inputXlsx || currentFormData.downloadRoot,
    );

    if (selectedXlsx) {
      await actOnXlsx(selectedXlsx);
    }
  };

  const actOnXlsx = async (xlsxToActOn: string) => {
    const isResumeFile = checkIfResumeFile(xlsxToActOn);
    setResumeMode(isResumeFile);

    if (isResumeFile) {
      const resumeData: ParsedAndValidatedResumeData =
        await window.electron.getParsedAndValidatedResumeData(xlsxToActOn);

      if (_.has(resumeData, "errorMessage")) {
        toast.error((resumeData as ErrorMessage).errorMessage);
      } else {
        setOriginalXlsx((resumeData as SubmitData).inputXlsx);
        setCurrentFormData({
          downloadRoot: (resumeData as SubmitData).downloadRoot,
          inputXlsx: xlsxToActOn,
          unidentifiedEncounters: (resumeData as SubmitData).unidentifiedEncounters,
          numAnnotationsPerId: (resumeData as SubmitData).numAnnotationsPerId,
          handleFinalSubmit: false,
        });
      }
    } else {
      setCurrentFormData((previous) => ({
        ...previous,
        inputXlsx: xlsxToActOn,
      }));
      setOriginalXlsx("");
    }
  };

  const openDirectoryDialog = async (): Promise<void> => {
    if (resumeMode) {
      setCurrentFormData((previous) => ({
        ...previous,
        handleFinalSubmit: true,
      }));
    } else {
      if (formDataValid()) {
        const selectedDirectory: string = await window.electron.openDirectoryDialog(
          currentFormData.downloadRoot,
        );

        if (selectedDirectory) {
          setCurrentFormData((previous) => ({
            ...previous,
            downloadRoot: selectedDirectory,
            handleFinalSubmit: true,
          }));
        }
      }
    }
  };

  const formDataValid = (): boolean => {
    if (!currentFormData.inputXlsx) {
      toast.error("Excel file missing");
      return false;
    }
    // if (!currentFormData.field1.good) return false;
    // if (!currentFormData.field2.good) return false;
    // if (!currentFormData.field3.good) return false;
    return true;
  };

  const unidentifiedEncountersOnChange = (e: ChangeEvent<HTMLButtonElement>): void => {
    setCurrentFormData((previous) => ({
      ...previous,
      unidentifiedEncounters: e.target.value === "yes",
    }));
  };

  return (
    <>
      <div>
        <div
          className={"d-flex"}
          style={{
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
          }}
        >
          <h1 className={"fw-bolder mt-3"}>WildEx</h1>

          <p>Download Annotated Images from Wildbook</p>

          <Form spellCheck={false}>
            <ol className={"main-list"}>
              <li>
                Generate & save Encounter Annotations Export file from Wildbook Encounter Search
              </li>

              <li>
                <div>Select Annotation export file:</div>

                <InputGroup className={"mt-1"}>
                  <Form.Control
                    onClick={openXlsxDialog}
                    readOnly={true}
                    type="text"
                    value={path.basename(currentFormData.inputXlsx)}
                  />
                  <Button variant={"secondary"} onClick={openXlsxDialog}>
                    <Icon.FiletypeXls title={"Select input .xls file"}></Icon.FiletypeXls>
                  </Button>
                </InputGroup>
              </li>

              <li>
                <div
                  className={"d-flex align-items-center"}
                  title={resumeMode && resumeModeTooltipText}
                >
                  <div>Include unidentified encounters in export? (Default is No)</div>

                  <div key={"inline-radio"} className="ms-4 mt-1">
                    <Form.Check
                      inline
                      label="No"
                      value={"no"}
                      name="unidentifiedEncounters"
                      type={"radio"}
                      checked={!currentFormData.unidentifiedEncounters}
                      onChange={unidentifiedEncountersOnChange}
                      disabled={resumeMode}
                    />
                    <Form.Check
                      inline
                      label="Yes"
                      value={"yes"}
                      name="unidentifiedEncounters"
                      type={"radio"}
                      checked={currentFormData.unidentifiedEncounters}
                      onChange={unidentifiedEncountersOnChange}
                      disabled={resumeMode}
                    />
                  </div>
                </div>
              </li>

              <li>
                <div>
                  Select # of annotations per Individual ID
                  <div
                    style={{
                      fontSize: "0.8rem",
                    }}
                    className={"mt-2"}
                  >
                    Default is <u>one each</u> of viewpoints: left, right, front, back (unless
                    export filters excluded viewpoints)
                    <ul className={"mt-1"}>
                      <li>
                        If not available, next available similar viewpoint is selected (ex.
                        leftfront, rightback)
                      </li>

                      <li>
                        If 2 annotations per individual is selected, 1 left & 1 right will be
                        exported per individual ID, where available
                      </li>
                    </ul>
                  </div>
                </div>

                <div className={"d-flex flex-row justify-content-center align-items-start mt-4"}>
                  <Form.Select
                    style={{
                      width: "6rem",
                      position: "absolute",
                      left: "10rem",
                    }}
                    className={"me-4"}
                    onChange={(e) => {
                      setCurrentFormData((previous) => ({
                        ...previous,
                        numAnnotationsPerId: e.target.value,
                      }));

                      if (e.target.value === "all") {
                        setModalShow(true);
                      }
                    }}
                    disabled={resumeMode}
                    title={resumeMode && resumeModeTooltipText}
                  >
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "All"].map((i) => (
                      <option
                        value={i.toLowerCase()}
                        selected={currentFormData.numAnnotationsPerId === i.toLowerCase()}
                      >
                        {i}
                      </option>
                    ))}
                  </Form.Select>

                  <div className={"d-flex flex-column align-items-center"}>
                    <div style={{ width: "20rem", transform: "translate(4rem)" }}>
                      <h5 className={"text-danger fw-semibold mb-0"}>Warning</h5>
                      <div className={"text-danger"}>
                        {/*Consider your internet connection as well as the number of encounters and*/}
                        {/*annotations in the source Export file before selecting the number of images*/}
                        {/*per individual in download*/}
                        Consider your internet connection as well as the number of
                        <i> unidentified </i> annotations in the source export file before selecting
                        the number of annotations per <i> ID'd individual </i> in the download
                      </div>
                    </div>

                    <Button
                      variant={"primary"}
                      style={{
                        fontSize: "1.4rem",
                        width: "12rem",
                      }}
                      className={"mt-4"}
                      onClick={() => {
                        if (currentFormData.numAnnotationsPerId === "all") {
                          setModalShow(true);
                        } else {
                          openDirectoryDialog();
                        }
                      }}
                    >
                      {resumeMode ? "Resume Download" : "Download Annotations"}
                    </Button>
                  </div>
                </div>
              </li>
            </ol>
          </Form>
        </div>
      </div>

      <Modal
        show={modalShow}
        onHide={() => {
          setModalShow(false);
        }}
        centered
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header>
          <Modal.Title className={"w-100"}>
            <div className={"d-flex justify-content-center"}>
              <div className={"fw-bold"}>WARNING!</div>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className={"modal-body"}>
          <div>
            You have selected "All" to download <b>ALL</b> annotations for <b>ALL</b> encounters in
            the Encounter Annotations Export file selected.
          </div>

          <div>
            This may take a <b>LONG</b> time and use <b>A LOT</b> of internet bandwidth.
          </div>

          <div>
            It could also use <b>MORE</b> storage space than is available on the drive you are
            downloading to.
          </div>

          <div>
            To <b>REDUCE</b> the size of your image download, create a smaller export file from
            Wildbook, using filters to narrow your search results. Or, click "Go Back" below to
            select a lower number of annotations for download.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div className={"mx-4 d-flex w-100 justify-content-center justify-content-around"}>
            <Button
              style={{
                width: "10rem",
              }}
              variant="danger"
              onClick={() => {
                setModalShow(false);
                openDirectoryDialog();
              }}
            >
              {resumeMode ? "Resume downloading ALL annotations" : "Download ALL annotations"}
            </Button>

            <Button
              style={{
                width: "10rem",
              }}
              className={"fs-5"}
              variant="success"
              onClick={() => {
                setModalShow(false);

                if (!resumeMode) {
                  setCurrentFormData((previous) => ({
                    ...previous,
                    numAnnotationsPerId: defaultNumAnnotationsPerId,
                  }));
                }
              }}
            >
              GO BACK
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      <FullScreenSpinner
        show={showSpinner}
        onCancel={() => {
          window.electron.haltFinalSubmit();
          setModalInfoText("Canceling...");
          // setShowSpinner(false);
        }}
        modalInfoText={modalInfoText}
      />

      <ToastContainer
        position={"top-right"}
        autoClose={5000}
        limit={6}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss={true}
        draggable={true}
        pauseOnHover={true}
        theme={"light"}
      />
    </>
  );
};

export default Dashboard;
