import axios from "axios";
import https from 'https';
import {dirname, resolve} from 'path';
import {fileURLToPath} from 'url';
import fs from 'fs';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);  // Get the file path
const __dirname = dirname(__filename);

const PRIVATE_TOKEN = "glpat-ec8Yya79CyzJjcozL2q8"
const GITLAB_GROUP_ID = "5"

const agent = new https.Agent({
    ca: fs.readFileSync(resolve(__dirname, '../gitlab.crt')),
    rejectUnauthorized: false
});


const $http = axios.create({
    baseURL: "https://infra-gitlab.infra.genios.de/api/v4",
    httpsAgent: agent
})


// Function to convert JSON to XLS
const convertJsonToXls = (fileName) => {
    const jsonFilePath = resolve(__dirname, `../dist/${fileName}.json`);
    const outputFilePath = resolve(__dirname, `../dist/${fileName}.xlsx`);

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

    console.log(`Conversion successful! Excel file saved as ${outputFilePath}`);
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
        console.log(e)
        return []
    }

}

const getCommits = async (projectId) => {
    try {
        const {data} = await $http.get(`/projects/${projectId}/repository/commits?ref_name=develop&since=2024-04-01&per_page=10000`, {
            headers: {
                "PRIVATE-TOKEN": PRIVATE_TOKEN
            }
        })
        return data.filter(item => item.title.includes("PN") || item.title.includes("PE") || item.title.includes("Revert")) || []
    } catch (e) {
        console.log(e)
        return []
    }
}

const clearResultsFile = () => {
    const filePathTest = resolve(__dirname, '../dist/resForTest.json');
    try {
        fs.writeFileSync(filePathTest, '', 'utf-8'); // Clear the contents of the file
        // Alternatively, you can use fs.unlinkSync(filePath); to delete the file completely
        console.log('Results file has been cleared.');
    } catch (e) {
        console.log('Error clearing the results file:', e);
    }

    const filePathDev = resolve(__dirname, '../dist/resForDev.json');
    try {
        fs.writeFileSync(filePathDev, '', 'utf-8'); // Clear the contents of the file
        // Alternatively, you can use fs.unlinkSync(filePath); to delete the file completely
        console.log('Results file has been cleared.');
    } catch (e) {
        console.log('Error clearing the results file:', e);
    }
};

getProjects().then(async (data) => {
    clearResultsFile()

    const resForTest = []
    const resForDev = []
    for (let i = 0; i < data.length; i++) {
        const {id, name} = data[i]
        const commits = await getCommits(id)
        commits.forEach(commit => {
            const ticket = getTicket(commit.title)
            resForDev.push({
                title: commit.title,
                ticket,
                link: `https://gbi-genios.atlassian.net/browse/${ticket}`,
                project: name
            })
            resForTest.push({
                link: `https://gbi-genios.atlassian.net/browse/${ticket}`,
                project: name
            })
        })
    }

    // Write results to results.json file
    fs.writeFileSync(resolve(__dirname, '../dist/resForTest.json'), JSON.stringify(resForTest, null, 2), 'utf-8');
    fs.writeFileSync(resolve(__dirname, '../dist/resForDev.json'), JSON.stringify(resForDev, null, 2), 'utf-8');
    console.log("Results have been written to results.json");
    //convert to xls
    convertJsonToXls("resForTest")
    convertJsonToXls("resForDev")
})

const getTicket = str => {
    console.log(str)
    const match = str.match(/P[NE]-\d+/);
    if (match) {
        return match[0]
    } else {
        return ""
    }
}