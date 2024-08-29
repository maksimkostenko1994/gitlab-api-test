import axios from "axios";
import _ from "lodash"

import https from 'https';
import fs from 'fs';
import XLSX from 'xlsx';

import dotenv from 'dotenv';

import {dirname, resolve} from 'path';
import {fileURLToPath} from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);  // Get the file path
const __dirname = dirname(__filename);

const PRIVATE_TOKEN = process.env.ACCESS_TOKEN;
const GITLAB_GROUP_ID = "5"

// const DIR_PATH = "../dist"
const DIR_PATH = ""

const agent = new https.Agent({
    ca: fs.readFileSync(resolve(__dirname, '../gitlab.crt')),
    rejectUnauthorized: false
});


const $http = axios.create({
    baseURL: process.env.GITLAB_BASE_URL,
    httpsAgent: agent
})


// Function to convert JSON to XLS
const convertJsonToXls = (fileName) => {
    const jsonFilePath = resolve(__dirname, `${DIR_PATH}${fileName}.json`);
    const outputFilePath = resolve(__dirname, `${DIR_PATH}${fileName}.xlsx`);

    // Check if the JSON file exists
    if (!fs.existsSync(jsonFilePath)) {
        console.error('Error: results.json file not found!');
        return;
    }

    // Read JSON file
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

    // Convert JSON data to a worksheet
    const worksheet = XLSX.utils.json_to_sheet(jsonData);

    // Create a new workbook and append the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

    // Write the workbook to a file
    XLSX.writeFile(workbook, outputFilePath);
};

const getProjects = async () => {
    try {
        const {data} = await $http.get(`/groups/${GITLAB_GROUP_ID}/projects?per_page=100`, {
            headers: {
                "PRIVATE-TOKEN": PRIVATE_TOKEN
            }
        })
        return data.reverse()
    } catch (e) {
        console.log("getProjects:error => ", e)
        return []
    }

}

const getCommits = async (projectId) => {
    try {
        let next_page = 1
        let mainResult = []
        do {
            const response = await $http.get(`/projects/${projectId}/repository/commits?ref_name=develop&since=2024-04-01&per_page=100&page=${next_page}`, {
                headers: {
                    "PRIVATE-TOKEN": PRIVATE_TOKEN
                }
            })
            next_page = parseInt(response.headers['x-next-page']) || undefined
            mainResult = [...mainResult, ...response.data.filter(item => item.title.includes("PN-") || item.title.includes("PE-") || item.title.includes("Revert") || item.title.includes("FUNKTIONEN-"))]
        } while (next_page !== undefined || next_page < 20);


        return mainResult
    } catch (e) {
        console.log("getCommits: error > ", e)
        return []
    }
}

const clearResultsFile = () => {
    const filePathTest = resolve(__dirname, `${DIR_PATH}resForTest.json`);
    try {
        fs.writeFileSync(filePathTest, '', 'utf-8'); // Clear the contents of the file
        // Alternatively, you can use fs.unlinkSync(filePath); to delete the file completely
    } catch (e) {
        console.log('Error clearing the results file:', e);
    }

    const filePathDev = resolve(__dirname, `${DIR_PATH}resForDev.json`);
    try {
        fs.writeFileSync(filePathDev, '', 'utf-8'); // Clear the contents of the file
        // Alternatively, you can use fs.unlinkSync(filePath); to delete the file completely
    } catch (e) {
        console.log('Error clearing the results file:', e);
    }
};

getProjects().then(async (data) => {
    clearResultsFile()

    let resForTest = []
    let resForDev = []
    for (let i = 0; i < data.length; i++) {
        const {id, name} = data[i]
        const commits = await getCommits(id)
        commits.forEach(commit => {
            const ticket = getTicket(commit.title)
            resForDev.push({
                title: commit.title,
                ticket,
                link: `https://gbi-genios.atlassian.net/browse/${ticket}`,
                project: name,
                date: commit.created_at.split('T')[0]
            })
            resForTest.push({
                link: `https://gbi-genios.atlassian.net/browse/${ticket}`,
                project: name,
                date: commit.created_at.split('T')[0]
            })
        })
    }

    resForTest = _.sortBy(_.uniqBy(resForTest, item => item.link), item => item.date).map(({date, ...rest}) => ({...rest}))
    resForDev = _.sortBy(_.uniqBy(resForDev, item => item.link), item => item.date)

    // Write results to results.json file
    fs.writeFileSync(resolve(__dirname, `${DIR_PATH}resForTest.json`), JSON.stringify(resForTest, null, 2), 'utf-8');
    fs.writeFileSync(resolve(__dirname, `${DIR_PATH}resForDev.json`), JSON.stringify(resForDev, null, 2), 'utf-8');

    //convert to xls
    convertJsonToXls("resForTest")
    convertJsonToXls("resForDev")

    console.log("Done")
})

const getTicket = str => {
    const match = str.match(/(PE|PN|FUNKTIONEN)-\d+/);
    if (match) {
        return match[0]
    } else {
        return ""
    }
}