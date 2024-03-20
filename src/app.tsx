import * as React from "react";
import * as ReactDOM from "react-dom";
import Dashboard from "./react-components/dashboard";

declare global {
  interface Window {
    electron: any;
  }
}

const App = () => {
  return <Dashboard />;
};

ReactDOM.render(<App />, document.getElementById("react-app"));
