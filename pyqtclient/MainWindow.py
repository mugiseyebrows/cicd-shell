
from PyQt5 import QtWidgets, QtNetwork, QtCore, QtGui
from Ui_MainWindow import Ui_MainWindow
from dataclasses import dataclass
import json
import os
from FileSelect import MODE_UPLOAD, MODE_DOWNLOAD

def set_maximum(scrollbar):
    scrollbar.setValue(scrollbar.maximum())

class KeyFilter(QtCore.QObject):
    keyUpPressed = QtCore.pyqtSignal()
    keyDownPressed = QtCore.pyqtSignal()
    def eventFilter(self, obj, event):
        if event.type() == QtCore.QEvent.KeyPress:
            if event.key() == QtCore.Qt.Key_Up:
                self.keyUpPressed.emit()
            elif event.key() == QtCore.Qt.Key_Down:
                self.keyDownPressed.emit()
        return False

class HideFilter(QtCore.QObject):
    hidden = QtCore.pyqtSignal()
    def eventFilter(self, obj, event):
        if event.type() == QtCore.QEvent.Hide:
            self.hidden.emit()
        return False

"""
def send_json(socket, handler=None, **kwargs):
    message = json.dumps(kwargs, ensure_ascii=False).encode('utf-8')
    if handler is not None:
        socket.readyRead.connect(lambda: handler(socket.readAll()))
    socket.write(message)
"""

def data_to_text(data):
    codec = QtCore.QTextCodec.codecForName('utf-8')
    text = codec.toUnicode(data)
    return text

"""
def read_text(socket):
    return data_to_text(socket.readAll())
"""

@dataclass
class DownloadState:
    file_size: int = -1
    buffer: object = None

class MainWindow(QtWidgets.QMainWindow):
    def __init__(self, parent = None):
        super().__init__(parent)
        ui = Ui_MainWindow()
        ui.setupUi(self)
        self._ui = ui
        ui.command.returnPressed.connect(self.onReturnPressed)

        ui.actionUpload.triggered.connect(ui.upload.show)
        ui.actionDownload.triggered.connect(ui.download.show)

        def onUploadPwd(data):
            ui.upload.setRemotePath(data_to_text(data))

        def onDownloadPwd(data):
            ui.download.setRemotePath(data_to_text(data))

        ui.upload.updateTriggered.connect(lambda: self._sendJson(onUploadPwd, ":pwd", command=":pwd"))
        ui.download.updateTriggered.connect(lambda: self._sendJson(onDownloadPwd, ":pwd", command=":pwd"))
        
        ui.download.setMode(MODE_DOWNLOAD)
        ui.upload.setMode(MODE_UPLOAD)

        ui.download.triggered.connect(self.onDownload)
        ui.upload.triggered.connect(self.onUpload)

        ui.download.hide()
        ui.upload.hide()

        filter = KeyFilter()
        ui.command.installEventFilter(filter)
        self._filter = filter

        model = QtCore.QStringListModel([])
        self._model = model

        completer = QtWidgets.QCompleter()
        #completer.setModel(model)
        completer.setModel(None)
        completer.setCompletionMode(QtWidgets.QCompleter.UnfilteredPopupCompletion)
        ui.command.setCompleter(completer)
        
        def onKeyUp():
            if completer.popup().isVisible():
                return
            completer.setModel(self._model)
            completer.complete()
            completer.popup().show()
            model = completer.popup().model()
            completer.popup().setCurrentIndex(model.index(model.rowCount()-1,0))
            
        def onKeyDown():
            if completer.popup().isVisible():
                return
            completer.setModel(self._model)
            completer.complete()
            completer.popup().show()
            model = completer.popup().model()
            completer.popup().setCurrentIndex(model.index(0,0))

        filter.keyUpPressed.connect(onKeyUp)
        filter.keyDownPressed.connect(onKeyDown)

        hideFilter = HideFilter(self)
        hideFilter.hidden.connect(lambda: completer.setModel(None))
        completer.popup().installEventFilter(hideFilter)

    def _setDownloadVisible(self, visible):
        ui = self._ui
        ui.downloadGroup.setVisible(visible)

    def _addToHistory(self, command):
        model = self._model
        row = model.rowCount()
        model.insertRow(row)
        model.setData(model.index(row, 0), command)

    def onUpload(self, remotePath, localPath):
        name = os.path.basename(localPath)
        file_size = os.path.getsize(localPath)
        def onResponse(data):
            self._appendText(data_to_text(data))
            pass
        socket = self._sendJson(onResponse, ":push {}".format(localPath), command=":push", file_size=file_size, name=name, path=remotePath)
        file = QtCore.QFile(localPath)
        if not file.open(QtCore.QIODevice.ReadOnly):
            QtWidgets.QMessageBox.critical(self, "", "Cannot open {}".format(localPath))
        buffer = file.readAll()
        socket.write(buffer)

    def onDownload(self, remotePath, localPath):
        ui = self._ui
        
        if os.path.exists(localPath) and os.path.isfile(localPath):
            resp = QtWidgets.QMessageBox.question(self, "", "Overwrite file {}?".format(localPath), QtWidgets.QMessageBox.Yes | QtWidgets.QMessageBox.No)
            if resp != QtWidgets.QMessageBox.Yes:
                return

        if os.path.exists(localPath) and os.path.isdir(localPath):
            localPath = os.path.join(localPath, os.path.basename(remotePath))

        state = DownloadState()
        state.buffer = QtCore.QByteArray()

        appendText = self._appendText

        def onFileData(chunk):
            buffer = state.buffer
            buffer.append(chunk)
            if buffer.size() >= state.file_size:
                file = QtCore.QFile(localPath)
                if not file.open(QtCore.QIODevice.WriteOnly):
                    appendText("cannot open file {}".format(localPath))
                    return
                file.write(buffer)
                appendText("saved as {}".format(localPath))
            
        def onInfo(data):
            message = json.loads(data_to_text(data))
            file_size = message.get('file_size')
            if file_size is None:
                appendText(message['error'])
                return
            state.file_size = file_size
            appendText("downloading {} bytes".format(state.file_size))
            self._sendJson(onFileData, ":pull {}".format(remotePath), command=":pull", path=remotePath)

        self._sendJson(onInfo, ":info {}".format(remotePath), command=":info", path=remotePath)

    def _sendJson(self, handler = None, debugMessage = None, **kwargs):
        socket = self._connect()
        j = kwargs
        j['secret'] = self._ui.secret.text()
        message = json.dumps(kwargs, ensure_ascii=False).encode('utf-8')
        if handler is not None:
            socket.readyRead.connect(lambda: handler(socket.readAll()))
        socket.write(message)
        if debugMessage is not None:
            self._appendText(debugMessage)
        self._socket = socket
        return socket

    def onReturnPressed(self):
        ui = self._ui
        command = ui.command.text()
        ui.command.setText('')
        ui.output.appendPlainText(command + "\n")
        self._addToHistory(command)
        if command == 'cls':
            ui.output.setPlainText('')
            return
        def onResponse(data):
            self._insertText(data_to_text(data))
        self._sendJson(onResponse, None, command=command)
        
    def _connect(self) -> QtNetwork.QTcpSocket:
        ui = self._ui
        host = ui.host.text()
        port = int(ui.port.text())
        socket = QtNetwork.QTcpSocket()
        socket.connectToHost(host, port)
        return socket

    def _appendText(self, text):
        output = self._ui.output
        output.appendPlainText(text)
        output.moveCursor(QtGui.QTextCursor.End)

    def _insertText(self, text):
        output = self._ui.output
        output.moveCursor(QtGui.QTextCursor.End)
        output.insertPlainText(text)
        output.moveCursor(QtGui.QTextCursor.End)
        
def main():
    app = QtWidgets.QApplication([])
    widget = MainWindow()
    widget.show()
    app.exec_()

if __name__ == "__main__":
    main()
