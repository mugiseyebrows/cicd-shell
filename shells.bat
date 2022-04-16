pushd %~dp0
set PATH=C:\nodejs;%PATH%
set DEBUG=cicd-shell
pushd mediator
    start cmd
popd
pushd pyqtclient
    if exist C:\Miniconda3\python.exe start cmd /k C:\Miniconda3\Scripts\activate.bat pyqt
    if exist C:\Users\Stanislav\miniconda3\python.exe start cmd /k C:\Users\Stanislav\miniconda3\Scripts\activate.bat pyqt
popd
pushd server
    start cmd
popd
pushd testclient
    start cmd
popd
popd