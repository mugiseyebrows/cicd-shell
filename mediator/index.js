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

var servers = []

function communicate(server, client) {
    let server_authorized = false
    let client_authorized = false

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

    server.on('data', (data) => {
        if (server_authorized) {
            client.write(data)
        } else {
            debug('authorizing server')
            authorize(data, argv.server_secret, 
            (err) => {
                console.log(err)
                client.end()
            }, (message, data) => {
                server_authorized = true
                debug('server authorized')
                if (data.length > 0) {
                    client.write(data)
                }
            })
        }
    })
    client.on('data', (data) => {
        if (client_authorized) {
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
    })
    server.on('close', () => {
        client.end()
    })
    
}

net.createServer().on('connection', (socket) => {
    console.log('server connected')
    servers.push(socket)
}).listen(argv.s, argv.b)

net.createServer().on('connection', (socket) => {
    if (servers.length > 0) {
        var server = servers.shift()
        communicate(server, socket)
    } else {
        console.log()
        socket.end('no servers left')
    }
}).listen(argv.c, argv.b)

console.log(`mediator waiting for server on ${argv.b}:${argv.s} for client on ${argv.b}:${argv.c}`)