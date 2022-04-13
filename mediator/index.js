const net = require('net')

const SERVER_PORT = 8857
const CLIENT_PORT = 8858
const HOST = "0.0.0.0"

let server = null
let client = null

function server_to_client(data) {
    try {
        client.write(data)
    } catch (e) {
        console.log(e)
    }
}

function client_to_server(data) {
    try {
        server.write(data)
    } catch (e) {
        console.log(e)
    }
}
function close_client() {
    if (client !== null) {
        client.end()
        client = null
    }
}

net.createServer().on('connection', (socket) => {
    console.log('server connected')
    server = socket
    server.on('data', server_to_client)
    server.on('close', close_client)
}).listen(SERVER_PORT, HOST)

net.createServer().on('connection', (socket) => {
    console.log('client connected')
    client = socket
    client.on('data', client_to_server)
}).listen(CLIENT_PORT, HOST)

console.log(`mediator waiting for server on 0.0.0.0:${SERVER_PORT} for client on 0.0.0.0:${CLIENT_PORT}`)