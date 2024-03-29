import express, {Request, Response} from 'express';
import cors from 'cors';
import { execSync, spawn } from 'child_process';
import { performance } from 'perf_hooks';
import process from 'process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { WebClient } from '@slack/web-api';
import cheerio from 'cheerio';
import minimist from 'minimist';
import * as banana from '@banana-dev/banana-dev';
import cron from 'node-cron';
import multer from 'multer';
import Hjson from 'hjson';
// @ts-ignore
import fetch from 'node-fetch';
// @ts-ignore
import AutoGitUpdate from 'auto-git-update';
// @ts-ignore
import PushBullet from 'pushbullet';
// @ts-ignore
import parser from '@tandil/diffparse'
import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Configuration
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const GITHUB_REPO = process.env['GITHUB_REPO'];
const GITHUB_TOKEN = process.env['GITHUB_TOKEN'];
const CONTAINER_REGISTRY = process.env['CONTAINER_REGISTRY'];
const SLACK_API_KEY = process.env['SLACK_API_KEY'];
const DOCKERHUB_USERNAME = process.env['DOCKERHUB_USERNAME'];
const DOCKERHUB_PASSWORD = process.env['DOCKERHUB_PASSWORD'];
const PUSHBULLET_API_KEY = process.env['PUSHBULLET_API_KEY'];
const BANANA_API_KEY = process.env['BANANA_API_KEY'];

// Rotating keys for Etherscan and Arbiscan

const etherscanApiKeys = process.env['ETHERSCAN_API_KEYS'] ? process.env['ETHERSCAN_API_KEYS'].split(',') : [];
const arbiscanApiKeys = process.env['ARBISCAN_API_KEYS'] ? process.env['ARBISCAN_API_KEYS'].split(',') : [];

const apiKeys: Record<string, string[]> = {
    etherscan: etherscanApiKeys,
    arbiscan: arbiscanApiKeys,
    // Add more types and their API keys as needed
};

const currentIndices: Record<string, number> = {
    etherscan: 0,
    arbiscan: 0,
    // Add more types and initialize their indices to 0
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Initializations
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const app = express();
const port = 8888;
app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));
const pusher = new PushBullet(PUSHBULLET_API_KEY);
const updateConfig = {
    repository: GITHUB_REPO,
    token: GITHUB_TOKEN,
    tempLocation: '/tmp',
    ignoreFiles: [],
    branch: 'main',
    exitOnComplete: true,
    executeOnComplete: 'tsc index.ts',
    purgeAndReinstallPackages: true,
};
const updater = new AutoGitUpdate(updateConfig);

const containerRegistry = CONTAINER_REGISTRY;

const web = new WebClient(SLACK_API_KEY);

const containerLogs: any[] = [];
const dockerHubUsername = DOCKERHUB_USERNAME;
const dockerHubPassword = DOCKERHUB_PASSWORD;

const userUploads = multer({ dest: 'user-uploads/' });

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Interfaces
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

interface Pfs {
    glob?: string;
    repo?: string;
}

interface PrePushHook {
    cmdList?: string[];
}

interface PostPushHook {
    cmdList?: string[];
    pipeline?: {
        pipeline?: {
            name?: string;
        };
        input?: {
            pfs?: Pfs;
            cross?: Pfs[];
        };
        transform?: {
            cmd?: string[];
            image?: string;
        };
    };
    k8s?: {
        selfLocation?: string;
        blueGreenDeploymentName?: string;
    };
}

interface EdithConfig {
    containerName?: string;
    prePushHook?: PrePushHook;
    postPushHook?: PostPushHook;
    tag?: string;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const runOne = (line: string) => {
    execSync(line, { stdio: 'inherit' });
};

const changeDirectory = (dirLoc: string) => {
    console.log('Current directory', process.cwd());
    process.chdir(dirLoc);
    console.log('Changed directory', process.cwd());
};

const purgeTagsForContainer = async (containerName: string, tag: string) => {
    // purge unused tags to be nice to docker hub for providing a free tier
    const rawToken = await fetch('https://hub.docker.com/v2/users/login/', {
        body: JSON.stringify({
            username: dockerHubUsername,
            password: dockerHubPassword,
        }),
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
    });
    const jsonToken = await rawToken.json();
    const token = jsonToken.token;
    const rawTags = await fetch(
        `https://hub.docker.com/v2/repositories/${dockerHubUsername}/edith-images/tags?page_size=10000`,
        {
            headers: {
                Authorization: `JWT ${token}`,
            },
        },
    );
    const jsonTags = await rawTags.json();
    if (jsonTags['results']) {
        jsonTags['results'].forEach(async (eachTag: any) => {
            const name = eachTag['name'];
            const splitName = name.split('_');
            const edithContainerName = splitName[0];
            const edithTag = splitName[1];
            if (edithContainerName === containerName && edithTag !== tag) {
                console.log('Deleting tag', name);
                const rawDelete = await fetch(
                    `https://hub.docker.com/v2/repositories/${dockerHubUsername}/edith-images/tags/${name}/`,
                    {
                        headers: {
                            Authorization: `JWT ${token}`,
                        },
                        method: 'DELETE',
                    },
                );
                const textDelete = await rawDelete.text();
                console.log(textDelete);
            }
        });
    }
};

const runPachctlCommand = (args: any[], stdinData: string, callback: any) => {
    console.log('Starting Process (Pachctl).');
    console.log('DEBUG: ', args, stdinData, callback);

    if ((args[0] !== 'get' && args[1] !== 'file') && (args[0] !== "create" && args[1] !== "repo") ) {
        args.push('--raw');
        args.push('|');
        args.push('jq');
        args.push('-sr');
        args.push('.');
    }

    const line = args.join(' ');

    const child = spawn('sh', ['-c', `pachctl ${line}`]);

    if (stdinData) {
        child.stdin.write(stdinData);
        child.stdin.end();
    }

    let scriptOutput = '';

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function (data: any) {
        // console.log('stdout: ' + data);

        data = data.toString();
        scriptOutput += data;
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', function (data: any) {
        // console.log('stderr: ' + data);

        data = data.toString();
        scriptOutput += data;
    });

    child.on('close', function (code: any) {
        callback(scriptOutput, code);
    });
};

const runKubectlCommand = (args: any[], stdinData: string, callback: any) => {
    console.log('Starting Process (Kubectl).');
    console.log('DEBUG: ', args, stdinData, callback);

    const line = args.join(' ');

    const child = spawn('sh', ['-c', `kubectl ${line}`]);

    if (stdinData) {
        child.stdin.write(stdinData);
        child.stdin.end();
    }

    let scriptOutput = '';

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function (data: any) {
        // console.log('stdout: ' + data);

        data = data.toString();
        scriptOutput += data;
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', function (data: any) {
        // console.log('stderr: ' + data);

        data = data.toString();
        scriptOutput += data;
    });

    child.on('close', function (code: any) {
        callback(scriptOutput, code);
    });
};

const runBuildPushContainer = ({
    containerName = 'edith-images',
    folderName,
    tag = 'latest',
}: {
    containerName: string;
    folderName: string;
    tag: string;
}) => {
    changeDirectory(`./containers/${folderName}`);
    runOne(
        `docker build --platform linux/amd64 -t ${containerRegistry}/${containerName}:${tag} --progress tty .`,
    );
    runOne(`docker push ${containerRegistry}/${containerName}:${tag}`);
    changeDirectory(`../../`);
};

const processPrePushHook = (preHookObj?: PrePushHook) => {
    if (preHookObj && preHookObj['cmdList']) {
        preHookObj['cmdList'].forEach((line: any) => {
            runOne(line);
        });
    }
};

const processPostPushHook = (
    builtContainerObj: any,
    postHookObj?: PostPushHook,
) => {
    // This block below triggers for a container was a pachyderm pipeline

    if (
        postHookObj &&
        postHookObj['pipeline'] &&
        postHookObj['pipeline']['transform']
    ) {
        postHookObj['pipeline']['transform'][
            'image'
        ] = `${containerRegistry}/edith-images:${
            builtContainerObj['tag'] === undefined
                ? `${builtContainerObj['containerName']}_latest`
                : `${builtContainerObj['containerName']}_${builtContainerObj['tag']}`
        }`;

        console.log(JSON.stringify(postHookObj, null, 4));
        fs.writeFileSync(
            '/tmp/thispipeline.json',
            JSON.stringify(postHookObj['pipeline'], null, 4),
            { encoding: 'utf8' },
        );
    }

    // This block below triggers for a container was a k8s deployment

    if (postHookObj && postHookObj['k8s']) {
        runOne(
            `kubectl get bluegreendeployment ${postHookObj['k8s']['blueGreenDeploymentName']} -o jsonpath='{.spec.template.spec.containers[0].image}' > existingImgTagBlueprint`,
        );
        runOne(`cat existingImgTagBlueprint`);
        const existingImgTagBlueprint = fs.readFileSync(
            './existingImgTagBlueprint',
            { encoding: 'utf-8', flag: 'r' },
        );
        runOne(
            `echo ${containerRegistry}/${builtContainerObj['containerName']}:${builtContainerObj['tag']} > currentImgTagBlueprint`,
        );
        runOne(`cat currentImgTagBlueprint`);
        const currentImgTagBlueprint = fs.readFileSync(
            './currentImgTagBlueprint',
            {
                encoding: 'utf-8',
                flag: 'r',
            },
        );
        if (postHookObj['cmdList']) {
            if (
                currentImgTagBlueprint.trim() == existingImgTagBlueprint.trim()
            ) {
                postHookObj['cmdList'].unshift(
                    `sed "s|{ { registryWithimgAndTag } }|${containerRegistry}/${builtContainerObj['containerName']}:${builtContainerObj['tag']}|" ${postHookObj['k8s']['selfLocation']}/self.yaml | kubectl apply -f -`,
                );
                postHookObj['cmdList'].unshift(
                    `sed "s|{ { registryWithimgAndTag } }|${containerRegistry}/${builtContainerObj['containerName']}:${builtContainerObj['tag']}|" ${postHookObj['k8s']['selfLocation']}/self.yaml | kubectl delete --ignore-not-found=true -f -`,
                );
            } else {
                postHookObj['cmdList'].unshift(
                    `sed "s|{ { registryWithimgAndTag } }|${containerRegistry}/${builtContainerObj['containerName']}:${builtContainerObj['tag']}|" ${postHookObj['k8s']['selfLocation']}/self.yaml | kubectl apply -f -`,
                );
            }
        }
    }

    if (postHookObj && postHookObj['cmdList']) {
        postHookObj['cmdList'].forEach((line: string) => {
            runOne(line);
        });
    }

    if (postHookObj && postHookObj['pipeline']) {
        fs.unlinkSync('/tmp/thispipeline.json');
    }
};

const tagMerger = (edithConfig: EdithConfig, buildTag: string) => {
    if (edithConfig['tag'] === undefined) {
        edithConfig['tag'] = buildTag;
    }
    return edithConfig;
};

const brobotPost = (message: string) => {
    try {
        web.chat.postMessage({
            channel: '#bro_bot',
            text: `${message}`,
        });
        console.log('Success!');
    } catch (error) {
        console.log(error);
    }
};

const runBananaInference = async (modelKey: string, modelParameters: any) => {
    console.log(BANANA_API_KEY);
    console.log(modelKey)
    console.log(modelParameters)
    
    return await banana.run(BANANA_API_KEY || '', modelKey, modelParameters);
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*


const axios = require('axios');
const cheerio = require('cheerio');

class BoringproxyBaseAPI {
  constructor(serverHost, accessToken) {
    this.serverHost = serverHost;
    this.accessToken = accessToken;
    this.headers = { Authorization: 'Bearer ' + this.accessToken };
    this.usersEndpoint = `https://${this.serverHost}/users`;
    this.deleteUserEndpoint = `https://${this.serverHost}/delete-user`;
    this.tokensEndpoint = `https://${this.serverHost}/tokens`;
    this.clientsEndpoint = `https://${this.serverHost}/clients`;
    this.deleteClientEndpoint = `https://${this.serverHost}/delete-client`;
    this.tunnelsEndpoint = `https://${this.serverHost}/tunnels`;
    this.deleteTunnelEndpoint = `https://${this.serverHost}/delete-tunnel`;
  }
}

class BoringproxyAdminAPI extends BoringproxyBaseAPI {
  constructor(serverHost, accessToken) {
    super(serverHost, accessToken);
  }

  async getUsers() {
    // Add your getUsers implementation
  }

  async createUser(username) {
    // Add your createUser implementation
  }

  async deleteUser(username) {
    // Add your deleteUser implementation
  }

  async checkUser(username) {
    // Add your checkUser implementation
  }

  async createFullUser(username) {
    // Add your createFullUser implementation
  }

  async getUsersTokens() {
    // Add your getUsersTokens implementation
  }

  async createToken(username, client = 'any') {
    // Add your createToken implementation
  }

  async getUserToken(username) {
    // Add your getUserToken implementation
  }
}

class BoringproxyUserAPI extends BoringproxyBaseAPI {
  constructor(serverHost, userName, accessToken) {
    super(serverHost, accessToken);
    this.userName = userName;
  }

  async getClients() {
    // Add your getClients implementation
  }

  async createClient(name) {
    // Add your createClient implementation
  }

  async deleteClient(name) {
    // Add your deleteClient implementation
  }
}

class BoringproxyClientAPI {
  constructor(user, name) {
    this.user = user;
    this.name = name;
  }

  async getTunnels() {
    // Add your getTunnels implementation
  }

  async createTunnel(domain, port, tunnelPort = 'Random', clientAddr = '127.0.0.1', tlsTermination = 'client', allowExternalTcp = false, passwordProtect = false, username = null, password = null) {
    // Add your createTunnel implementation
  }

  async deleteTunnel(port) {
    // Add your deleteTunnel implementation
  }
}

module.exports = {
  BoringproxyAdminAPI,
  BoringproxyUserAPI,
  BoringproxyClientAPI,
};


*/

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/app.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'app.js'));
});

app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'style.css'));
})

app.post('/post', (req, res) => {
    res.send('Ack!');
    brobotPost(req.body['message']);
});

app.post('/build', async (req, res) => {
    // Use this! Not buildContainers!
    res.send('Building!');
    await updater.forceUpdate();
});

app.get("/apiKey", (req: Request, res: Response) => {
    const keyType = req.query.keyType as string; // Add an explicit type assertion here

    if (!keyType || !apiKeys[keyType]) {
        return res.status(400).json({ error: "Invalid keyType" });
    }

    // check if the user is authenticated in header
    // if not, return 401

    if (req.headers.authorization !== "Bearer " + process.env['GITHUB_TOKEN']) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const apiKey = apiKeys[keyType][currentIndices[keyType]];
    currentIndices[keyType] = (currentIndices[keyType] + 1) % apiKeys[keyType].length;
    console.log("sending", apiKey, "for", keyType)
    res.json({ apiKey });
});
  

app.post('/runPachctlCommand', async (req, res) => {
    runPachctlCommand(req.body.args, req.body.stdin, function (output:any, exitCode:any) {
        res.send(output);
    });
});

app.post('/runKubectlCommand', async (req, res) => {
    runKubectlCommand(req.body.args, req.body.stdin, function (output: any, exitCode: any) {
        res.send(output);
    });
});

app.post('/runBananaInference', async (req, res) => {
    console.log(req.body)
    res.send(
        await runBananaInference(req.body.modelKey, req.body.modelParameters),
    );
});

app.post('/buildContainer', async (req, res) => {
    // used from edith.lol
    const { files } = req.body;
    // console.log(files);
    const { name } = req.body;
    // console.log(name);
    const { tag } = req.body;
    // console.log(tag);

    const preparedResponse: any = {};

    let tmpDir: any;
    const appPrefix = 'edith-temp-container-';
    try {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), appPrefix));
        // tmpDir = fs.mkdtempSync(path.join('./', appPrefix));
        // the rest of your app goes here

        console.log(`Created temp directory: ${tmpDir}`);

        Object.keys(files).forEach((toWriteFile: any) => {
            const fileDir = path.dirname(`${tmpDir}/${toWriteFile}`);
            if (!fs.existsSync(fileDir)) {
                fs.mkdirSync(fileDir, { recursive: true });
            }
            fs.writeFileSync(`${tmpDir}/${toWriteFile}`, files[toWriteFile], {
                encoding: 'utf8',
            });
        });

        const edithConfig = tagMerger(
            {},
            tag,
        );

        const t0 = performance.now();
        const currentScriptDirectory = path.dirname(
            fs.realpathSync(__filename),
        );
        console.log(currentScriptDirectory);
        changeDirectory(tmpDir);

        // TODO: purge unused tags

        console.log('Building container...');
        console.log(
            `docker build --platform linux/amd64 -t ${containerRegistry}/edith-images:${edithConfig['tag']} .`,
        );
        runOne(
            `docker build --platform linux/amd64 -t ${containerRegistry}/edith-images:${name}_${edithConfig['tag']} .`,
        );
        console.log('Pushing container...');
        runOne(
            `docker push ${containerRegistry}/edith-images:${name}_${edithConfig['tag']}`,
        );
        changeDirectory(currentScriptDirectory);

        preparedResponse[
            'edithImageTag'
        ] = `${containerRegistry}/edith-images:${name}_${edithConfig['tag']}`;

        const t1 = performance.now();
    } catch (e) {
        console.error(e);
        // handle error
    } finally {
        try {
            if (tmpDir) {
                console.log(`Removing temp directory: ${tmpDir}`);
                fs.rmSync(tmpDir, { recursive: true });
            }
        } catch (e) {
            console.error(
                `An error has occurred while removing the temp folder at ${tmpDir}. Please remove it manually. Error: ${e}`,
            );
        }
    }

    res.send(preparedResponse);
});

app.post('/getDiff', async (req: any, res: any) => {
const { diff } = req.body;
console.log('diffing...');

const diffedObj = await parser.parseDiffString(diff);

res.send(diffedObj);
});


app.post('/buildContainers', (req: any, res: any) => {
    console.log('Building containers!');

    // import json to build
    // In the future, you should be able to use this hjson to build a container

    const containersToBeBuilt: any[] = [];
    const edithConfigList: any[] = [
        // './containers/ph-datumcreator/edith-config.hjson',
        // './containers/ph-insightextractor/edith-config.hjson',
        // './containers/ph-metaextractor/edith-config.hjson',
        // './containers/ph-datumcombiner/edith-config.hjson',
        // './containers/ph-datumzipper/edith-config.hjson',
        // './containers/simple-blender-framesplitter/edith-config.hjson',
        // './containers/simple-blender-framerenderer/edith-config.hjson',
        // './containers/blender-framesplitter/edith-config.hjson',
        // './containers/blender-framerenderer/edith-config.hjson',
        // './containers/blender-framemerger/edith-config.hjson',
        // './containers/crypto-passivbot/edith-config.hjson',
        // './containers/dao-terminal/edith-config.hjson',
        // './containers/dragdropwebsite-fullstack/edith-config.hjson',
        // './containers/dragdroptools-fullstack/edith-config.hjson',
        // './containers/ffmpeg-simpleconvert/edith-config.hjson',
        // './containers/servicehub-pyback/edith-config.hjson',
        // './containers/servicehub-nodeback/edith-config.hjson',
        // './containers/servicehub-moser/edith-config.hjson',
        // './containers/servicehub-goback/edith-config.hjson',
        // './containers/servicehub-redis/edith-config.hjson',
        // './containers/hwga-dwdori/edith-config.hjson',
        // './containers/hwga-dwdori-solr/edith-config.hjson',
        // './containers/openfaas-sentimentanalysis/edith-config.hjson',
        // './containers/lipsync-inference/edith-config.hjson',
        // './containers/gh-indexer/edith-config.hjson',
        // './containers/videosimilaritydeterminer/edith-config.hjson',
    ];

    edithConfigList.forEach((container: string) => {
        const edithConfig: EdithConfig = tagMerger(
            Hjson.parse(
                fs.readFileSync(container, { encoding: 'utf8', flag: 'r' }),
            ),
            uuidv4(),
        );
        containersToBeBuilt.push(edithConfig);
    });

    const builtContainers: any[] = [];

    const t0 = performance.now();
    containersToBeBuilt.forEach((container: EdithConfig) => {
        processPrePushHook(container.prePushHook);
        if (container.containerName && container.tag) {
            purgeTagsForContainer(container.containerName, container.tag);
            runBuildPushContainer({
                containerName: 'edith-images',
                folderName: container.containerName,
                tag: container.containerName + '_' + container.tag,
            });
        }
        processPostPushHook(container, container.postPushHook);
        builtContainers.push(`${container.containerName}`);
    });
    const t1 = performance.now();

    pusher.note({}, 'Build log', JSON.stringify(builtContainers), () => {
        console.log(builtContainers);
    });

    // BroBot
    brobotPost(
        `*Build Log*\n \`\`\`${JSON.stringify(
            builtContainers,
            null,
            4,
        )}\n${JSON.stringify(containerLogs, null, 4)}\`\`\` \nTook ${(
            (t1 - t0) /
            1000 /
            60
        ).toFixed()} mins to build`,
    );
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Cron(s)
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const IS_NOTIFYING = false;

// Cron timers

// Every 5 minutes
// */5 * * * *
// Every hour
// 30 * * * *

cron.schedule('30 * * * *', () => {
    console.log('Querying for job status(es)!');
    fetch('http://localhost:8888/runPachctlCommand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            args: ['list', 'job'],
        }),
    })
        .then((res: any) => res.json())
        .then((res: any) => {
            res.forEach((eachPipeline: any) => {
                if (
                    eachPipeline.pipeline.name === 'phinsights' ||
                    eachPipeline.pipeline.name === 'phmeta'
                ) {
                    fetch('http://localhost:8888/runPachctlCommand', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            args: ['inspect', 'job', eachPipeline.job.id],
                        }),
                    })
                        .then((res2: any) => res2.json())
                        .then((res2: any) => {
                            console.log(
                                `${eachPipeline.pipeline.name}: ${res2[0].data_processed} / ${res2[0].data_total}`,
                            );
                            if (IS_NOTIFYING) {
                                brobotPost(
                                    `*Pipeline - ${eachPipeline.pipeline.name}*\n \`\`\`` +
                                        `${res2[0].data_processed} / ${
                                            res2[0].data_total
                                        } => ${Math.round(
                                            (res2[0].data_processed /
                                                res2[0].data_total) *
                                                100,
                                        )}%` +
                                        `\`\`\` \n`,
                                );
                            }
                        });
                }
            });
        });
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Starting the server
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.listen(port, () => {
    console.log(`Edith listening at http://0.0.0.0:${port}`);

    // fetch('http://localhost:8888/buildContainers', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //     },
    // });

    // fetch('http://localhost:8888/runPachctlCommand', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //         args: [
    //             'get',
    //             'file',
    //             'phfile@master:/file/edith-resources/60fps.txt',
    //         ],
    //         // args: ['list', 'repo'],
    //     }),
    // })
    //     .then((res: any) => res.text())
    //     .then((body: any) => {
    //         try {
    //             return JSON.parse(body);
    //         } catch {
    //             return body;
    //         }
    //     })
    //     .then(console.log)
    //     .catch(console.error);
});
