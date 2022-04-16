const net = require('net')
const fs = require('fs')
const path = require('path')
const debug = require('debug')('cicd-shell')

const argv = require('yargs')
    .command('$0 <host> <port> <secret> [options]')
    .option("port", {type: 'number', description: 'mediator port'})
    .option("host", {type: 'string', description: 'mediator host'})
    .argv;

//console.log(argv)

function execute(command) {
    return new Promise((resolve, reject) => {
        let client = new net.Socket()
        client.connect(argv.port, argv.host, () => {
            console.log(':write')
            client.write(JSON.stringify({command, secret: argv.secret}))
        })
        client.on('data', (data) => {
            console.log('< data')
            console.log(data.toString())
        })
        client.on('close', () => {
            console.log(':close')
            resolve()
        })
    })
}

function push_file(file_path) {
    return new Promise((resolve, reject) => {
        let client = new net.Socket()
        client.connect(argv.port, argv.host, () => {
            let buffer = fs.readFileSync(file_path)
            client.write(JSON.stringify({
                command: ":push", 
                name: path.basename(file_path), 
                path: ".",
                file_size: buffer.length,
                secret: argv.secret
            }))
            client.write(buffer)
        })
        client.on('data', (data) => {
            console.log('< data')
            console.log(data.toString())
        })
        client.on('close', () => {
            resolve()
        })
    })
}

function file_info(file_path) {
    return new Promise((resolve, reject) => {
        let client = new net.Socket()
        client.connect(argv.port, argv.host, () => {
            client.write(JSON.stringify({command: ":info", path: file_path, secret: argv.secret}))
        })
        client.on('data', (data) => {
            let message = JSON.parse(data.toString())
            resolve(message.file_size)
        })
        client.on('close', () => {
            console.log(':close')
        })
    })
}
function sum_length(items) {
    return items.reduce((p,c) => p + c.length, 0)
}

function send_request(onconnect, ondata) {
    return new Promise((resolve, reject) => {
        let client = new net.Socket()
        debug('client.connect')
        client.connect(argv.port, argv.host, () => {
            onconnect(client)
        })
        client.on('data', ondata)
        client.on('close', resolve)
    })
}

function pull_file(file_path, size) {
    return new Promise((resolve, reject) => {
        let client = new net.Socket()
        let buffers = []
        client.connect(argv.port, argv.host, () => {
            client.write(JSON.stringify({command: ":pull", path: file_path, secret: argv.secret}))
        })
        client.on('data', (data) => {
            buffers.push(data)
            if (sum_length(buffers) >= size) {
                resolve(Buffer.concat(buffers))
            }
        })
        client.on('close', () => {
            console.log(':close')
        })
    })
}

console.log('client');

(async () => {
    
    let file_path = path.join(__dirname, "..", "images/pyqtclient.png")

    // tst push file
    await push_file(file_path)
    console.log(`pushed ${file_path}`)

    // test pull file
    let file_size = await file_info(file_path)
    console.log('file_size', file_size)
    let buffer = await pull_file(file_path, file_size)
    let tmp_path = path.join(process.env.TEMP, path.basename(file_path))
    fs.writeFileSync(tmp_path, buffer)
    console.log(`saved as ${tmp_path}`)

    var commands = [
        'echo 1', 
        'cd C:\\windows', 
        'dir',
        'echo %CD%',
        ':pwd',
    ]

    for(let command of commands) {
        console.log('> ' + command)
        await execute(command)
    }

function write_json(client, obj) {
    obj.secret = argv.secret
    let stringified = JSON.stringify(obj)
    client.write(stringified)
}

function log_data(data) {
    console.log(data.toString())
}

async function test_base64() {
    debug('test_base64')
    let command = "echo 1 {}"
    command = Buffer.from(command).toString('base64')
    debug('command', command)
    await send_request((client) => write_json(client, {command, encoding: 'base64'}), log_data)
}

(async () => {
    
    // tst push file

    /*await test_push_file()
    await test_pull_file()
    await test_commands()*/
    await test_base64()


})()