export * from "../share/process";
export * from "../TypeScriptUtils/broker";
export * from "../TypeScriptUtils/debug";
export * from "../TypeScriptUtils/logger";
import {
    LogConfigRecord,
    Logger,
} from "../TypeScriptUtils/logger";

export const logConfig: LogConfigRecord = {
    console: {
        enable: true,
        logLevel: "info",
    },
    cloudWatch: {
        enable: false,
        logLevel: "info",
    }
};

Logger.process = new Logger(
    "tcs",
    logConfig);

import { promisify } from "util";
export const setTimeoutPromise = promisify(setTimeout);

export enum ExitCode {
	NormalExit = 0,
	GeneralFailure,
	SIGTERM_Exit,
	SIGINT_Exit
}

