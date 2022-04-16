const net = require('net')
const debug = require('debug')('cicd-shell')

const argv = require('yargs')
    .command('$0 <server_secret> <client_secret> [options]')
    .option('s', {description: 'server port'})
    .option('c', {description: 'client port'})
    .option('b', {description: 'bind ip'})
    .default({s: 8857, c: 8858, b: '0.0.0.0'})
    .argv;

//console.log(argv); //process.exit(0)

function authorize(data, secret, onerror, onsuccess) {
    let op_br = data.indexOf(Buffer.from("{"))
    let cl_br = data.indexOf(Buffer.from("}"))
    if (op_br !== 0) {
        return onerror("op_br != 0")
    }
    if (cl_br < 0) {
        return onerror("cl_br < 0")
    }
    let message = JSON.parse(data.slice(0, cl_br + 1).toString())
    if (message.secret === secret) {
        return onsuccess(message, data.slice(cl_br + 1))
    } else {
        return onerror("incorrect secret")
    }
}

class Worker {
    constructor(server) {
        this._server = server
        this._client = null
        this._server_authorized = false
        this._client_authorized = false
        server.on('data', (data) => this.onServerData(data))
    }
    onServerData(data) {
        //let server = this._server
        let client = this._client
        if (this._server_authorized) {
            client.write(data)
        } else {
            debug('authorizing server')
            authorize(data, argv.server_secret, 
            (err) => {
                console.log(err)
                if (client !== null) {
                    client.end()
                }
            }, (message, data) => {
                this._server_authorized = true
                debug('server authorized')
                if (data.length > 0) {
                    if (client === null) {
                        debug('client is null')
                    } else {
                        client.write(data)
                    }
                }
            })
        }
    }
    onClientData(data) {
        let server = this._server
        let client = this._client
        if (this._client_authorized) {
            server.write(data)
        } else {
            debug('authorizing client')
            authorize(data, argv.client_secret, (err) => {
                client.end(err)
            }, (message, data) => {
                debug('cleint authorized')
                message.secret = undefined
                server.write(JSON.stringify(message))
                if (data.length > 0) {
                    server.write(data)
                }
            })
        }
    }
    setClient(client) {
        this._client = client
        client.on('data', (data) => this.onClientData(data))
    }
}

var workers = []

net.createServer().on('connection', (socket) => {
    debug('server connected')
    workers.push(new Worker(socket))
}).listen(argv.s, argv.b)

net.createServer().on('connection', (socket) => {
    debug('client connected')
    if (workers.length > 0) {
        var worker = workers.shift()
        worker.setClient(socket)
    } else {
        console.log('no workers left')
        socket.end('no workers left')
    }
}).listen(argv.c, argv.b)

console.log(`mediator waiting for server on ${argv.b}:${argv.s} for client on ${argv.b}:${argv.c}`)