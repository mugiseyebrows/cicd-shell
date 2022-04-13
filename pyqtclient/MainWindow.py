
from PyQt5 import QtWidgets, QtNetwork, QtCore, QtGui
from Ui_MainWindow import Ui_MainWindow

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

class MainWindow(QtWidgets.QMainWindow):
    def __init__(self, parent = None):
        super().__init__(parent)
        ui = Ui_MainWindow()
        ui.setupUi(self)
        self._ui = ui
        ui.command.returnPressed.connect(self.onReturnPressed)

        filter = KeyFilter()
        ui.command.installEventFilter(filter)
        self._filter = filter

        model = QtCore.QStringListModel([]) # todo history
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
        
    def _addToHistory(self, command):
        model = self._model
        row = model.rowCount()
        model.insertRow(row)
        model.setData(model.index(row, 0), command)

    def onReturnPressed(self):
        ui = self._ui
        host = ui.host.text()
        port = int(ui.port.text())

        command = ui.command.text()

        ui.command.setText('')
        ui.output.appendPlainText(command + "\n")

        self._addToHistory(command)

        if command == 'cls':
            ui.output.setPlainText('')
            return

        socket = QtNetwork.QTcpSocket()
        self._socket = socket
        socket.connectToHost(host, port)
        socket.readyRead.connect(self.onReadyRead)
        socket.write(command.encode('utf-8'))

    def _appendText(self, text):
        output = self._ui.output
        output.moveCursor(QtGui.QTextCursor.End)
        output.insertPlainText(text)
        output.moveCursor(QtGui.QTextCursor.End)

    def onReadyRead(self):
        data = self._socket.readAll()
        codec = QtCore.QTextCodec.codecForName('utf-8')
        text = codec.toUnicode(data)
        self._appendText(text)

def main():
    app = QtWidgets.QApplication([])
    widget = MainWindow()
    widget.show()
    app.exec_()

if __name__ == "__main__":
    main()
