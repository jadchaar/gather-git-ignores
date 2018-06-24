import * as OctoKit from "@octokit/rest";
import { config } from "dotenv";

config();
const octokit = new OctoKit();

octokit.authenticate({
	type: "token",
	token: String(process.env.GITHUB_TOKEN),
});

// Compare: https://developer.github.com/v3/repos/#list-organization-repositories
octokit.repos.getForOrg({
	org: "octokit",
	type: "public",
}).then(({data, headers, status}) => {
	// console.log(data);
	if (!data) console.log("Herp");
	console.log(headers);
	console.log(status);
});

// with an without comments

// TODO: Create a front end UI for this!
