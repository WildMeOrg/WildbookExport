import * as React from "react";
import { Button, Spinner } from "react-bootstrap";
import { useState } from "react";

const FullScreenSpinner = ({ show, onCancel, modalInfoText }: { show: boolean; onCancel: () => any; modalInfoText: string }) => {
  return (
    <div
      style={{
        ...{
          position: "fixed",
          top: "0",
          left: "0",
          width: "100vw",
          height: "100vh",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 123456789,
        },
        ...{
          display: show ? "flex" : "none",
        },
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.9)",
        }}
      ></div>

      <div style={{ zIndex: 1234567890 }} className={"d-flex flex-column align-items-center"}>
        <div className={"d-flex align-items-center"}>
          <Spinner animation={"border"} variant={"light"} role={"status"} />
          <span className={"ps-3 text-white"}>{modalInfoText}</span>
        </div>
        <Button variant={"danger"} className={"mt-3"} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default FullScreenSpinner;
