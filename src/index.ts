import * as OctoKit from "@octokit/rest";
import axios from "axios";
import { green, red } from "colors";
import { config } from "dotenv";
import { createWriteStream, promises as fs } from "fs";
// import { promises as fs } from "fs";

config();
const octokit = new OctoKit();

octokit.authenticate({
	type: "token",
	token: String(process.env.GITHUB_TOKEN),
});

// Compare: https://developer.github.com/v3/repos/#list-organization-repositories
// octokit.repos.getForOrg({
// 	org: "octokit",
// 	type: "public",
// }).then(({data, headers, status}) => {
// 	// console.log(data);
// 	if (!data) console.log("Herp");
// 	console.log(headers);
// 	console.log(status);
// });

octokit.repos.getContent({
	owner: "github",
	repo: "gitignore",
	path: "",
})
.then(async ({data, headers, status}) => {
	if (status !== 200) {
		throw new Error(`Unable to get contents from github/gitignore. Server responded with ${headers.status}.`);
	}
	const ignores = await getUserIgnoreList();
	getGitIgnores(ignores, data);
	// console.log(data);
})
.catch((error: Error) => {
	console.error(red(error.message));
	if (error.stack) console.error(error.stack);
});

const getUserIgnoreList = async (): Promise<object> => {
	const toIgnore = JSON.parse(await fs.readFile("./src/ignore.json", {
		encoding: "utf8",
	}));
	const toIgnoreList: string[] = [];
	Object.keys(toIgnore).map((key: string) => {
		toIgnoreList.push(...toIgnore[key]);
	});
	return toIgnoreList;
};

const getGitIgnores = async (ignores: object, data: object): Promise<void> => {
	// console.log(data);
	// console.log(ignores);

	const finalGitIgnorePath = "./src/ultimateGitIgnore.txt";

	await fs.access(finalGitIgnorePath)
	.then(() => fs.unlink(finalGitIgnorePath))
	.catch((error) => {
		if (error.code !== "ENOENT") throw error;
	});

	// if (false) console.log(ignores);
	const downloadLinks: Array<Promise<string>> = [];
	Object.values(ignores).map(async (val: string) => {
		const currentGitIgnore = `${val}.gitignore`;
		downloadLinks.push(getDownloadLink(data, currentGitIgnore));
	});

	Promise.all(downloadLinks)
	.then(async (links) => {
		console.log(links);
		const ws = createWriteStream(finalGitIgnorePath, {
			flags: "ax",
		})
		.on("finish", () => {
			console.log(green("Writing complete!"));
		});

		for (const l of links) {
			// console.log(l);
			const response = await axios.get(l, {
				responseType: "blob",
			});

			if (response.status !== 200) {
				throw new Error(`Unable to get data from ${l}. Server responded with ${response.status}.`);
			}

			ws.write(process.argv[2] ? response.data.replace(/#.*/g, "").replace(/^\s*[\r\n]/gm, "") : `${response.data}\n`);
		}

		ws.end();
	});
};

const getDownloadLink = async (gitIgnoresData: object, currentGitIgnore: string): Promise<string> => {
	// console.log(currentGitIgnore);
	const result: DataEntry[] = Object.values(gitIgnoresData).filter((obj: DataEntry) => {
		return obj.name === currentGitIgnore;
	});
	let downloadUrl = "";

	// Handle gitignores in Global path
	if (!result.length) {
		await octokit.repos.getContent({
			owner: "github",
			repo: "gitignore",
			path: "Global",
		})
		.then(async ({data, headers, status}) => {
			if (status !== 200) {
				throw new Error(`Unable to get contents from github/gitignore/Global. Server responded with ${headers.status}.`);
			}
			downloadUrl = await getDownloadLink(data, currentGitIgnore);
		});
	}

	return result[0] ? result[0].download_url : downloadUrl;
};

interface DataEntry {
	"name": string;
	"path": string;
	"sha": string;
	"size": number;
	"url": string;
	"html_url": string;
	"git_url": string;
	"download_url": string;
	"type": string;
	"_links": {
		"self": string;
		"git": string;
		"html": string;
	};
}

// TODO: Improve type definitions when passing objects into functions
// TODO: Add flag to trim coments from concatenated gitignores
// TODO: Create a front end UI for this!
