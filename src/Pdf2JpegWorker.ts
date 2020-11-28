import {copyFile, mkdir, rmdir} from "fs/promises";
import {promisify} from "util";
import {execFile} from "child_process";
import {RmOptions} from "fs";
import {AbstractWorker} from "ts-jobserver-simple/dist/core/AbstractWorker";
import {IWorker} from "ts-jobserver-simple/dist/core/IWorker";
import {JobStatus} from "ts-jobserver-simple/dist/core/JobStatus";

export class Pdf2JpegWorker extends AbstractWorker {

    static BIN_ZIP = '/usr/bin/zip';
    static BIN_PDFTOPPM = '/usr/bin/pdftoppm';

    getOutputContentType(): string {
        return "application/zip";
    }

    getInputContentType(): string {
        return "application/pdf";
    }

    async do(): Promise<IWorker> {
        this.logger.info("start");
        this.job.status = JobStatus.Running;

        let success = await this.createTempDir();
        if (success) success = await this.generateJpegs();
        if (success) success = await this.zipJpegs();
        if (success) success = await this.removeTempDir();

        this.logger.info("end");
        return this;
    }

    protected async createTempDir() {
        try {
            this.logger.debug("create-temp-dir");
            await mkdir(this.job.workDir);
            await mkdir(this.job.workDir + `/pdf`);
            await mkdir(this.job.workDir + `/jpeg`);
            await copyFile(this.job.inputFile, this.job.workDir + '/pdf/source.pdf');
            return true;
        } catch (e) {
            this.logger.error("create-temp-dir failed", e);
            this.job.status = JobStatus.Error;
            return false;
        }
    }

    protected async generateJpegs() {
        const exec = promisify(execFile);
        try {
            this.logger.info("generate-jpegs");
            let pdf = this.job.workDir + '/pdf/source.pdf';
            let out = this.job.workDir + '/jpeg/' + this.getJob().name;
            const {stdout, stderr} = await exec(Pdf2JpegWorker.BIN_PDFTOPPM, ['-jpeg', pdf, out]);
            console.log(stdout);
            console.error(stderr);
            return true;
        } catch (e) {
            this.logger.error("generate-jpegs failed", e);
            this.job.status = JobStatus.Error;
            return false;
        }
    }

    protected async zipJpegs() {
        const exec = promisify(execFile);
        try {
            this.logger.info("zip-jpegs");
            let zip = this.job.workDir + '/result.zip';
            let dir = this.job.workDir + '/jpeg/';
            const {stdout, stderr} = await exec(Pdf2JpegWorker.BIN_ZIP, ['-r', zip, '.'], {cwd: dir});
            console.log(stdout);
            console.log(stderr);
            return true;
        } catch (e) {
            this.logger.error("zip-jpegs failed", e);
            this.job.status = JobStatus.Error;
            return false;
        }
    }

    protected async removeTempDir() {
        try {
            this.logger.info("remove-temp-dir");
            await copyFile(this.job.workDir + '/result.zip', this.job.outputFile);
            this.job.status = JobStatus.Finished;
            await rmdir(this.job.workDir, <RmOptions>{force: true, recursive: true});
            return true;
        } catch (e) {
            this.logger.error("remove-temp-dir failed", e);
            this.job.status = JobStatus.Error;
            return false;
        }
    }
}
