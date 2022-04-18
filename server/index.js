const net = require('net')
const child_process = require('child_process')
const iconv = require('iconv-lite')
const fs = require('fs')
const path = require('path')
const ruchardet = require('ruchardet')
const chardet = require('chardet')
const debug = require('debug')('cicd-shell')

let cwd = process.cwd()

let workspace = process.env.GITHUB_WORKSPACE
if (workspace !== undefined) {
    set_cwd(workspace)
}

const argv = require('yargs')
    .command('$0 <host> <port> <secret> [options]')
    .option('c', {
        alias: 'chardet',
        description: 'use chardet to detect output encoding'
    })
    .option('r', {
        alias: 'ruchardet',
        description: 'use ruchardet to detect output encoding'
    })
    .option("port", {type: 'number', description: 'mediator port'})
    .option("host", {type: 'string', description: 'mediator host'})
    .option("enc", {type: 'string', description: 'output encoding'})
    .argv;

let cli_enc = 'utf8'
function detect_cli_enc() {
    if (process.platform !== 'win32') {
        return
    }
    child_process.exec('echo тест', {encoding: 'buffer'}, (err, stdout, stderr) => {
        let samples = {
            cp866: new Uint8Array([0xe2, 0xa5]),
            cp1251: new Uint8Array([0xf2, 0xe5]),
            utf8: new Uint8Array([0xd1, 0x82]),
        }
        for (let enc in samples) {
            if (stdout.indexOf(samples[enc]) > -1) {
                cli_enc = enc
                //console.log('cli_enc', cli_enc)
                return
            }
        }
        console.log('unknown enc', stdout)
    })
}

if (argv.chardet === undefined && argv.ruchardet === undefined && argv.enc === undefined) {
    detect_cli_enc()
}

function spawn(executable, args, cwd, onstdout, onstderr) {
    return new Promise((resolve, reject) => {
        try {
            if (cwd !== undefined && !fs.existsSync(cwd)) {
                cwd = undefined
            }
            let proc = child_process.spawn(executable, args, {cwd, shell:true})
            proc.stdout.on('data', onstdout)
            proc.stderr.on('data', onstderr)
            proc.on('close', resolve)
        } catch (e) {
            onstderr(e.message)
            resolve()
        }
    })
}

function space_split(text) {
    var res = []
    var item = ''
    var in_str = false
    for(var c of text) {
        if (c == '"') {
            in_str = !in_str
            if (!in_str) {
                res.push(item)
                item = ''
            } else {
                
            }
        } else if (c == ' ') {
            if (in_str) {
                item = item + c
            } else {
                res.push(item)
                item = ''
            }
        } else {
            item = item + c
        }
    }
    if (item.length > 0) {
        res.push(item)
    }
    return res
}

function split_args(command) {
    let [executable, ...args] = space_split(command)
    return [executable, args]
}

function replace_vars(dst) {
    if (process.platform === 'win32') {
        let vars = dst.match(/%[^%]*%/g)
        if (vars === null) {
            return dst
        }
        for (let n of vars) {
            let n_ = n.replace(/%/g,'')
            let v = process.env[n_]
            if (v === undefined) {
                v = ''
            }
            dst = dst.replace(n, v)
        }
    } else {
        let vars = dst.match(/\$[a-zA-Z0-9_]*/g)
        if (vars === null) {
            return dst
        }
        for (let n of vars) {
            let n_ = n.replace('$','')
            let v = process.env[n_]
            if (v === undefined) {
                v = ''
            }
            dst = dst.replace(n, v)
        }
    }
    return dst
}

function set_cwd(dst) {
    dst = replace_vars(dst)
    if (!path.isAbsolute(dst)) {
        if (cwd !== undefined) {
            dst = path.join(cwd, dst)
        }
    }
    if (fs.existsSync(dst) && fs.statSync(dst).isDirectory()) {
        cwd = dst
        return true
    } 
    return false
}

function handle_push(message, client, data) {
    //console.log('handle_push')
    try {
        
        const path_ = message.path
        const name = message.name

        if (path_ === undefined || name === undefined) {
            client.write(`path ${path_} name ${name}`, () => client.end())
            return
        }

        let file_path = path_
        if (fs.existsSync(path_) && fs.statSync(path_).isDirectory()) {
            file_path = path.join(path_, name)
        }

        fs.writeFileSync(file_path, data)
        console.log(`${file_path} writen`)
        client.write(`${file_path} writen`, () => client.end())
    } catch (e) {
        console.log(e)
        client.end()
    }
}

function handle_pull(message, client) {
    console.log('handle_pull')
    try {
        const buffer = fs.readFileSync(message.path)
        client.write(buffer, () => client.end())
    } catch (e) {
        console.log(e)
        client.end()
    }
}

function handle_info(message, client) {
    let file_size
    let error
    try {
        file_size = fs.statSync(message.path).size
    } catch (e) {
        error = e.message
    }
    let reponse = JSON.stringify({file_size, error})
    console.log(reponse)
    client.write(reponse, () => client.end())
}

function handle_pwd(message, client) {
    client.write(cwd, () => client.end())
}

function handle_complete(message, client) {
    let p = message.path
    let base
    let n

    let relative = !path.isAbsolute(p)
    if (relative) {
        p = path.join(cwd, p)
    }

    if (p.endsWith('/') || p.endsWith('\\')) {
        base = p.replace(/[\/\\]$/,'')
        n = ''
    } else {
        base = path.dirname(p)
        n = path.basename(p)
    }
    if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
        let name_filter = item => item.startsWith(n)
        if (process.platform == 'win32') {
            name_filter = item => item.toLowerCase().startsWith(n)
        } 
        let paths = fs.readdirSync(base).filter(name_filter).map(e => path.join(base, e))
        if (message.type === 'dir') {
            paths = paths.filter(e => {
                try {
                    return fs.statSync(e).isDirectory()
                } catch (e) {
                    return false
                }
            })
        }
        if (relative) {
            paths = paths.map(e => path.relative(cwd, e))
        }
        client.write(JSON.stringify({paths}), () => client.end())
    } else {
        client.write(JSON.stringify({error: `${base} not a directory`}), () => client.end())
    }

}

function handle_command(message, client, data) {
    let command = message.command
    if (message.encoding == 'base64') {
        command = Buffer.from(command, 'base64').toString()
    }
    let [executable, args] = split_args(command)
    if (executable == 'cd') {
        let dst = args[0]
        if (!set_cwd(dst)) {
            client.write(`no such directory ${dst}\n`)
        }
        if (process.platform === 'win32') {
            executable = 'echo'
            args = ["%CD%"]
        } else {
            executable = 'pwd'
            args = []
        }
    }
    if (executable == 'exit') {
        process.exit(0)
    }
    
    function write(data) {
        if (Buffer.isBuffer(data)) {
            let enc = cli_enc
            if (argv.ruchardet) {
                enc = ruchardet.detect(data)
            } else if (argv.chardet) {
                enc = chardet.detect(data)
            } else if (argv.enc !== undefined) {
                enc = argv.enc
            }
            client.write(iconv.decode(data, enc))
        } else {
            client.write(data)
        }
    }

    spawn(executable, args, cwd, write, write).then(() => {client.end()})
}

function sum_length(items) {
    return items.reduce((p,c) => p + c.length, 0)
}

function connect() {
    var client = new net.Socket()
    client.connect(argv.port, argv.host, ()=>{
        console.log(`connected to ${argv.host} ${argv.port}`)
        client.write(JSON.stringify({secret: argv.secret}))
    })

    let message = null
    let buffers = []
    let file_offset = -1

    client.on('data', (data) => {
        debug('client on data')
        buffers.push(data)
        if (message === null) {
            let buffer = Buffer.concat(buffers)
            let op_br = buffer.indexOf(Buffer.from("{"))
            let cl_br = buffer.indexOf(Buffer.from("}"))
            if (op_br !== 0) {
                return client.write('error p1 !== 0', () => client.end())
            }
            if (cl_br > -1) {
                message = JSON.parse(buffer.slice(op_br, cl_br+1).toString())
                file_offset = cl_br + 1
                debug('message received', message)
            } else {
                debug('waiting for message')
            }
        }
        if (message !== null) {
            if (message.file_size !== undefined) {
                var length = sum_length(buffers)
                if (length - file_offset >= message.file_size) {
                    if (length - file_offset != message.file_size) {
                        console.log('file_size error')
                    }
                    if (message.command === ':push') {
                        return handle_push(message, client, Buffer.concat(buffers).slice(file_offset))
                    } else {
                        return client.write('not push command but with file', () => client.end())
                    }
                } else {
                    console.log('waiting for more data')
                }
            } else {
                if (message.command === ':pull') {
                    return handle_pull(message, client)
                } else if (message.command === ':info') {
                    return handle_info(message, client)
                } else if (message.command === ":pwd") {
                    return handle_pwd(message, client)
                } else if (message.command === ":complete") {
                    return handle_complete(message, client)
                } else {
                    return handle_command(message, client)
                }
            }
        }
    })
    client.on('close', () => {
        connect()
    })
}

console.log('server');

for(var i=0;i<5;i++) {
    connect()
}
