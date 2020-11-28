import {Logger} from "tslog";
import {Pdf2JpegWorker} from "./Pdf2JpegWorker";
import {Server} from "ts-jobserver-simple/dist/core/Server";

const logger = new Logger({name: "pdf2jpeg-job-server"});
try {
    logger.info("starting");
    const jobServer = new Server({
        logger: logger,
        workdir: '/tmp',
        port: 8080
    });
    process.on('SIGINT', async () => {
        logger.info("SIGINT received, shutting down.");
        await jobServer.shutdown();
    });

    jobServer.registerWorkerType(Pdf2JpegWorker);

    Promise.all([jobServer.start()]).then(() => {
        logger.info("started");
    }).catch((e) => {
        logger.error("cannot start", e);
    });
} catch (error) {
    logger.error("error during initialization", error);
}
