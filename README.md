## Manual Build Instructions


# Project Build and Packaging Instructions

This guide explains how to manually build and package the application for different platforms without using GitHub Actions.

## Prerequisites
- Node.js (v18 or higher)
- Python (v3.10)
- A working internet connection to install dependencies

---

## Steps to Build and Package the Application

### 1. Install Dependencies
Run the following command to install all required dependencies:

```bash
npm install --no-audit
```

If your project relies on native dependencies (e.g., node-gyp), ensure Python is properly configured:

On macOS/Linux:

``` bash

export NODE_GYP_FORCE_PYTHON=$(which python3)
```

On Windows, manually set the Python path by running:

```powershell

$env:NODE_GYP_FORCE_PYTHON = (Get-Command python | Select-Object -ExpandProperty Path)
```

2. Build the Application
Run the following command to generate platform-specific installers:

```bash

npm run make
```

This will create the output files in the out/make directory.

3. Verify the Output
Once the build process is complete, check the out/make directory for the generated files:

On macOS/Linux:

```bash
ls out/make
```

On Windows:

```
powershell

dir  out\make\squirrel.windows\x64
```

4. Upload Installers
Locate the generated installer files:

.dmg for macOS
.exe for Windows
Manually upload these files to the desired location (e.g., file server, cloud storage).

## Notes:
If you encounter issues during dependency installation, ensure Python is correctly installed and accessible in your system’s PATH.
Suppress warnings about vulnerabilities using the --no-audit flag when running npm install.
For more debugging, check the build logs in your terminal or use the verbose mode:

```bash

npm run make -- --verbose
```
