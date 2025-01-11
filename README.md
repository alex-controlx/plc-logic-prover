# PLC Logic Prover
The quality of a PLC program is defined by the quantity of tests.

To build and run locally started:
    1. Clone the repo
    2. Run `npm install`
    3. Run `npm run build:react`
    4. Run `npm run start:electron-tsc`


To package in one file:
    1. Node.js v16 is required, use `nvm install 16`
    2. Run `npm run package:mac:linux`
    3. Run `npm run package:win`


### Building and Publishing
On Mac (includes Linux), open Terminal and run the following commands:
```bash
npm run package:mac:linux
```

On Windows (use VM) open Command Prompt and run the following commands:
```bash
git pull && npm install
# there may be a need to set the certificate and password
# set CSC_LINK=%cd%\<CodeSigningCertificate File>.pfx && set CSC_KEY_PASSWORD=password
npm run package:win
```
    
