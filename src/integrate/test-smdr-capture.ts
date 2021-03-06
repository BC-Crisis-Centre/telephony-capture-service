#!/usr/bin/env node
// tslint:disable: indent

import { EventEmitter } from "events";
import _ from "lodash";
import fs from "fs";
import dir from "node-dir";

import {
	CRLF,
	REGEXP_SMDR_FILENAME
} from "../share/constants";
import { ClientSocket, createClient } from "../share/client-socket";
import { Queue } from "../share/queue";
import { sleep } from "../share/util";
import { debugTcs } from "../Barrel";

const pgp = require("pg-promise")();

const ee = new EventEmitter();

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num } = envalid;

const env = envalid.cleanEnv(process.env, {
	TCS_PORT: num(),
	TEST_TRANSMIT_INTERVAL: num(),
	DATABASE: str(),
	DB_QUEUE: str()
});

let smdrFiles: string[] = [];
let smdrFileNo = 0;
let smdrMsgsSent: number = 0;
let tcsClient: ClientSocket;

const sendSmdrRecords = async (smdrFileName: string): Promise<void> => {

	try {
		const data = await fs.promises.readFile(smdrFileName);

		process.stdout.write("Sending " + smdrFileName + "  ");

		let index: number = 0;
		let next_index: number = 0;

		const intervalId = setInterval(() => {

			// Look for SMDR record boundaries until there are no more
			if ((next_index = data.indexOf(CRLF, index)) < 0) {
				process.stdout.write(
					`\bis complete.  ${smdrMsgsSent} SMDR records sent.\r\n`);
				clearInterval(intervalId);
				ee.emit("next");
			} else {
				++smdrMsgsSent;
				const nextMsg = data.slice(index, next_index + 2);

				index = next_index + 2;

				// Randomly partition socket writes to ensure TCS handles gracefully
				const partition = Math.floor(Math.random() * nextMsg.length);
				const firstPart = nextMsg.slice(0, partition);
				const secondPart = nextMsg.slice(partition);

				if (!tcsClient.write(firstPart) || !tcsClient.write(secondPart)) {
					debugTcs("Link to TCS unavailable...aborting.");
					process.exit(1);
				}
			}
		}, env.TEST_TRANSMIT_INTERVAL);

	} catch (err) {
		debugTcs(err);
	}
};

const connection = {
	host: "localhost",
	port: 5432,
	database: env.DATABASE,
	user: "postgres"
};

const db = pgp(connection);

const checkRecordCount = async () => {

	try {
		const response = await db.one("select count(*) from smdr;");
		debugTcs(response.count);
		if (response.count === smdrMsgsSent) {
			debugTcs(`Passed: ${smdrMsgsSent} messages sent and received`);
			process.exit(0);
		}
		else {
			debugTcs(`Failed: ${smdrMsgsSent} messages sent and ${response.count} received`);
			process.exit(1);
		}
	} catch (err) {
		debugTcs("Postgres query failed: ", err);
		process.exit(1);
	}
};

const nextFile = async () => {

	try {
		if (smdrFileNo === smdrFiles.length) {

			// Wait a bit and then confirm the count in the database
			await sleep(10000);
			await checkRecordCount();
		}
		else {
			sendSmdrRecords(smdrFiles[smdrFileNo]);
			++smdrFileNo;
		}
	} catch (err) {
		debugTcs(err);
		process.exit(1);
	}
};

ee.on("next", nextFile);

const sendData = async () => {

	// Search the source directory looking for raw SMDR files
	const files =
		await dir.promiseFiles("./sample-data/smdr-data/smdr-one-file");

	// Deliver the data in chronological order
	files.sort();

	for (let file of files) {

		let path = file.split("/");

		// Only interested in SMDR files
		if (path[path.length - 1].match(REGEXP_SMDR_FILENAME)) {
			smdrFiles.push(file);
		}
	}
	await nextFile();
};

// Clear both the DB_QUEUE and the smdr table
const databaseQueue = new Queue(env.DB_QUEUE);
sleep(2000)
	.then(databaseQueue.purge)
	.then(() => db.none("delete from smdr;"))
	.then(() => createClient("pbx=>tcs", "localhost", env.TCS_PORT, sendData))
	.then((client: ClientSocket) => tcsClient = client)
	.catch(error => { debugTcs(JSON.stringify(error, null, 4)); process.exit(1); });
