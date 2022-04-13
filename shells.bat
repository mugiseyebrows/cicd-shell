pushd %~dp0
set PATH=C:\nodejs;%PATH%
pushd mediator
    start cmd
popd
pushd pyqtclient
    start cmd /k C:\Users\Stanislav\miniconda3\Scripts\activate.bat pyqt
popd
pushd server
    start cmd
popd
popd