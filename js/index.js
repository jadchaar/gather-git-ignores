"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctoKit = require("@octokit/rest");
const axios_1 = require("axios");
const colors_1 = require("colors");
const dotenv_1 = require("dotenv");
const fs_1 = require("fs");
// import { promises as fs } from "fs";
dotenv_1.config();
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
    .then(async ({ data, headers, status }) => {
    if (status !== 200) {
        throw new Error(`Unable to get contents from github/gitignore. Server responded with ${headers.status}.`);
    }
    const ignores = await getUserIgnoreList();
    getGitIgnores(ignores, data);
    // console.log(data);
})
    .catch((error) => {
    console.error(colors_1.red(error.message));
    if (error.stack)
        console.error(error.stack);
});
const getUserIgnoreList = async () => {
    const toIgnore = JSON.parse(await fs_1.promises.readFile("./src/ignore.json", {
        encoding: "utf8",
    }));
    const toIgnoreList = [];
    Object.keys(toIgnore).map((key) => {
        toIgnoreList.push(...toIgnore[key]);
    });
    return toIgnoreList;
};
const getGitIgnores = async (ignores, data) => {
    // console.log(data);
    // console.log(ignores);
    const finalGitIgnorePath = "./src/ultimateGitIgnore.txt";
    await fs_1.promises.access(finalGitIgnorePath)
        .then(() => fs_1.promises.unlink(finalGitIgnorePath))
        .catch((error) => {
        if (error.code !== "ENOENT")
            throw error;
    });
    // if (false) console.log(ignores);
    const downloadLinks = [];
    Object.values(ignores).map(async (val) => {
        const currentGitIgnore = `${val}.gitignore`;
        downloadLinks.push(getDownloadLink(data, currentGitIgnore));
    });
    Promise.all(downloadLinks)
        .then(async (links) => {
        console.log(links);
        const ws = fs_1.createWriteStream(finalGitIgnorePath, {
            flags: "ax",
        })
            .on("finish", () => {
            console.log(colors_1.green("Writing complete!"));
        });
        for (const l of links) {
            // console.log(l);
            const response = await axios_1.default.get(l, {
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
const getDownloadLink = async (gitIgnoresData, currentGitIgnore) => {
    // console.log(currentGitIgnore);
    const result = Object.values(gitIgnoresData).filter((obj) => {
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
            .then(async ({ data, headers, status }) => {
            if (status !== 200) {
                throw new Error(`Unable to get contents from github/gitignore/Global. Server responded with ${headers.status}.`);
            }
            downloadUrl = await getDownloadLink(data, currentGitIgnore);
        });
    }
    return result[0] ? result[0].download_url : downloadUrl;
};
// TODO: Improve type definitions when passing objects into functions
// TODO: Add flag to trim coments from concatenated gitignores
// TODO: Create a front end UI for this!
