const net = require('net')

const argv = require('yargs')
    .command('$0 <host> <port> [options]')
    .option("port", {type: 'number', description: 'mediator port'})
    .option("host", {type: 'string', description: 'mediator host'})
    .argv;

function execute(command) {
    return new Promise((resolve, reject) => {
        let client = new net.Socket()
        client.connect(argv.port, argv.host, () => {
            console.log(':write')
            client.write(command)
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

console.log('client');

(async () => {

    var commands = [
        'echo 1', 
        'cd C:\\windows', 
        'dir',
        'echo %CD%'
    ]

    for(let command of commands) {
        console.log('> ' + command)
        await execute(command)
    }

})()