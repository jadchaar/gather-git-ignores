"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctoKit = require("@octokit/rest");
const dotenv_1 = require("dotenv");
dotenv_1.config();
const octokit = new OctoKit();
octokit.authenticate({
    type: "token",
    token: String(process.env.GITHUB_TOKEN),
});
// Compare: https://developer.github.com/v3/repos/#list-organization-repositories
octokit.repos.getForOrg({
    org: "octokit",
    type: "public",
}).then(({ data, headers, status }) => {
    // console.log(data);
    if (!data)
        console.log("Herp");
    console.log(headers);
    console.log(status);
});
// with an without comments
