declare module "pdfjs-dist/legacy/build/pdf.worker.js" {
  const workerModule: {
    WorkerMessageHandler: unknown;
  };

  export = workerModule;
}

declare global {
  var pdfjsWorker:
    | {
        WorkerMessageHandler: unknown;
      }
    | undefined;
}

export {};
