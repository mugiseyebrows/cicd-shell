# cicd-shell

Shell for fiddling with ci/cd.

Run mediator on public server (vps).

```bash
ssh user@your.public.server
git clone --depth=1 https://github.com/mugiseyebrows/cicd-shell.git
node cicd-shell/mediator/index.js
```

Insert `cicd-shell` to pipeline (todo: github action).

```yaml
jobs:
  main:
    runs-on: windows-latest
    steps:
    - uses: actions/setup-node@v3
    - run: git clone --depth=1 https://github.com/mugiseyebrows/cicd-shell.git
    - run: |
        pushd cicd-shell\server
          npm i
        popd
      shell: cmd
    - run: node cicd-shell\server\index.js your.public.server 8857
      shell: cmd
```

Commit and push.

Wait until mediator prints `server connected`.

Run `pyqtclient` on local machine. 

```cmd
git clone --depth=1 https://github.com/mugiseyebrows/cicd-shell.git
python cicd-shell\pyqtclient\main.py
```

Connect to `your.public.server:8858`, and execute commands.

![image](images/pyqtclient.png)

# How it works

- Server connects to mediator and waits for command.
- Client connects to mediator, sends command and waits for responce. 
- Mediator sends command to server, recieves responce, sends responce to client.
- Server closes connection to mediator. 
- Mediator closes connection to client.
- Server reconnects for next command.

![image](images/sequence-diagram.png)