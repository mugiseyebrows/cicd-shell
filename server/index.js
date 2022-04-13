const net = require('net')
const child_process = require('child_process')
const iconv = require('iconv-lite')
const fs = require('fs')
const path = require('path')
const ruchardet = require('ruchardet')
const chardet = require('chardet')

let cwd = process.cwd()

let workspace = process.env.GITHUB_WORKSPACE
if (workspace !== undefined) {
    set_cwd(workspace)
}

const argv = require('yargs')
    .command('$0 <host> <port> [options]')
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

function execute() {
    return new Promise((resolve, reject) => {
        var client = new net.Socket()
        client.connect(argv.port, argv.host, ()=>{
            console.log(`connected to ${argv.host} ${argv.port}`)
        })
        client.on('data', (data) => {
            let command = data.toString()
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
            
            console.log({executable, args, cwd})

            function on_data(data) {
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
            spawn(executable, args, cwd, on_data, on_data).then(() => {client.end()})
        })
        client.on('close', () => {
            resolve()
        })
    })
}

console.log('server');

(async () => {
    while (true) {
        await execute()
    }
})()