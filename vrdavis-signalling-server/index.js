import { join, dirname } from 'path';
import { Low, JSONFileSync } from 'lowdb';
import { fileURLToPath } from 'url'

import WebSocket, { WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';

// Database - LowDB
const directory = dirname(fileURLToPath(import.meta.url));

const file = join(directory, 'db.json');
const adapter = new JSONFileSync(file);
const db = new Low(adapter);
await db.read();

if(db) log('[info] Database connected');

const PORT = process.env.PORT || 3003;
// const PORT = process.env.PORT || 8080;

const app = express();
const server = http.createServer(app);

app.get('*', function (req, res) {
    res.send('Hello World!');
});

const wss = new WebSocketServer({ server });
wss.on('connection', function connection(ws) {
    const pairingCodes = new Array();
    let pairingDeviceId;
    let pairingDeviceName;

    ws.on('message', async function message(data) {
        log(`[received] ${data}`);

        let msg = JSON.parse(data);

        switch (msg.type) {
            case 'clear-pairs': 
                await clearPairs();
                break;
            case 'get-pairs':
                ws.send(JSON.stringify({
                    type: 'pairs',
                    data: {
                        pairs: await getPairs()
                    }
                }));
                log('[send] Device pairs');
                break;
            case 'open':
                // check if device is paired
                ws.id = msg.data.uuid;
                ws.vr = msg.data.vr;
                ws.name = msg.data.name;
                if(await isPaired(msg.data.id))
                {
                    const pair = await getPair(msg.data.uuid);
                    ws.send(JSON.stringify({
                        type: 'paired',
                        data: {
                            paired: true,
                            pair: pair
                        }
                    }));
                    log('[send] Device is already paired');
                    await requestIceCredentials(ws.id);
                }
                else {
                    // start pairing process
                    ws.send(JSON.stringify({
                        type: 'devices',
                        data: {
                            devices: await getAvailableVRDevices()
                        }
                    }));
                    log('[send] Available devices');
                }
                ws.send(JSON.stringify({
                    type: 'pairs',
                    data: await getPairs()
                }));
                break;
            case 'pair-code':
                pairingDeviceId = msg.data.uuid;
                pairingDeviceName = msg.data.name;
                // pairingCodes.push(msg.data.code);
                ws.pairingCode = msg.data.code;
                requestPairConfirmation(msg.data.uuid);
                break;
            case 'pair-code-confrimation-response':
                ws.pairingCode = msg.data.code;
                // vrStatus = msg.data.vr;
                if(checkCode(ws.pairingCode)) {
                    await db.read();
                    log('[info] Pairing codes match');
                    const { pairs } = db.data
                    const pair = {
                        vrDevice: {
                            name: ws.name,
                            uuid: ws.id
                        },
                        desktopDevice: {
                            name: pairingDeviceName,
                            uuid: pairingDeviceId
                        }
                    }
                    await pairs.push(pair)
                    await db.write();
                    log('[info] Pair added to db');
                    // send pair details to both clients
                    await sendPaired(pair)
                    log('[send] Pairing confirmation');
                    await requestIceCredentials(ws.id);
                } 
                else log(`[error] Pairing codes do not match`)
                break;
            case 'ice-credentials-response':
                // ws.ice = msg.data.ice
                log('[info] ICE credentials received')
                // send ice credentials to paired device
                const offer = msg.data.offer;
                await sendOffer(msg.data.pairedId, offer);
                break;
            case 'rtc-answer':
                log('[info] Web RTC answer received')
                const answer = msg.data.answer;
                await sendAnswer(msg.data.pairedId, answer);
                break;
            default:
                log(`[error] unknown message type "${msg.type}"`);
                break;
        }

        wss.clients.forEach(function each(client) {
            if(client != ws && client.readyState == WebSocket.OPEN) {
                // client.send(data);
                // console.log()
            }
        });
    });
});

const clearPairs = async () => {
    db.data.pairs = [];
    await db.write();
};

const getPairs = async () => {
    return db.data;
};

const sendPaired = async (pair) => {
    wss.clients.forEach(function each(client) {
        if(pair.vrDevice.uuid === client.id || pair.desktopDevice.uuid === client.id) {
            client.send(JSON.stringify({
                type: 'paired',
                data: {
                    paired: true,
                    pair: pair
                }
            }));
            log('[send] Web RTC offer');
            return;
        }
    });
}

const checkCode = async (code) => {
    wss.clients.forEach(function each(client) {
        if(client.pairingCode === code) {
            return true;
        }
    });
    return false;
};

const getAvailableVRDevices = async () => {
    const devices = new Array();
    wss.clients.forEach(function each(client) {
        // if(client != ws && client.readyState == WebSocket.OPEN) {
        if(client.readyState == WebSocket.OPEN && client.vr) {
            devices.push({uuid: client.id, name: client.name});
        }
    });
    return devices;
};

const requestPairConfirmation = (id) => {
    wss.clients.forEach(function each(client) {
        if(client.id === id) {
            client.send(JSON.stringify({
                type: 'pair-code-confirmation-request',
                data: {}
            }));
            log('[send] Pair code confirmation request');
        }
    });
}

const isPaired = async (id) => {
    await db.read();
    const { pairs } = db.data;
    let flag = false;
    if(pairs.length > 0) {
        pairs.forEach(pair => {
            if(pair.vrDevice.uuid === id || pair.desktopDevice.uuid === id)
                flag = true;
        });
    }
    return flag;
}

const getPair = async (id) => {
    await db.read();
    const { pairs } = db.data;
    if(pairs.length > 0) {
        pairs.forEach(pair => {
            if(pair.desktopDevice.uuid === id || pair.vrDevice.uuid === id)
                return pair;
        });
    }
    else return null;
}

const sendOffer = async (id, offer) => {
    wss.clients.forEach(function each(client) {
        if(client.id === id) {
            client.send(JSON.stringify({
                type: 'rtc-offer',
                data: {
                    offer: offer
                }
            }));
            log('[send] Web RTC offer');
            return;
        }
    });
}

const sendAnswer = async (id, answer) => {
    wss.clients.forEach(function each(client) {
        if(client.id === id) {
            client.send(JSON.stringify({
                type: 'rtc-answer',
                data: {
                    answer: answer
                }
            }));
            log('[send] Web RTC answer');
            return;
        }
    });
}

const requestIceCredentials = async (id) => {
    await db.read();
    const { pairs } = db.data;
    let devicePair = null;
    if(pairs.length > 0) {
        pairs.forEach(pair => {
            if(pair.desktopDevice.uuid === id || pair.vrDevice.uuid === id)
                devicePair = pair
        });
    }
    wss.clients.forEach(function each(client) {
        if(client.id === devicePair.desktopDevice.uuid || client.id === devicePair.vrDevice.uuid) {
            client.send(JSON.stringify({
                type: 'ice-credentials-request',
                data: {}
            }));
            log('[send] ICE credentials request');
        }
    });
}

server.listen(PORT, function() {
    log(`Server is listening on port ${PORT}`);
})

// if(wss)
//     log("Signaling server listening on port " + PORT);
// else
//     log("ERROR: Unable to create WebSocket server!");

// wss.on('connection', function connection(ws) {
//     log('[open] Client connected');

//     ws.on('message', function message(data) {
//         console.log('received: %s', data);

    //     let jsonObject = JSON.parse(data)

        // switch (jsonObject.type) {
        //     case 'open':
        //         log(JSON.stringify(jsonObject.data));
        //         ws.send(JSON.stringify({
        //             type: 'devices',
        //             data: {
        //                 devices: ['device1', 'device2', 'device3']
        //             }
        //         }));
        //         break;
        //     default:
        //         log('unknown message type');
        //         break;
        // }
//     });

    

    
// });

function log(text) {
    var time = new Date();
    console.log("[" + time.toLocaleTimeString() + "] " + text);
}
