from threading import local
from PyQt5 import QtWidgets, QtCore
from Ui_FileSelect import Ui_FileSelect
import os

(
    MODE_UPLOAD,
    MODE_DOWNLOAD
) = range(2)

class FileSelect(QtWidgets.QWidget):

    triggered = QtCore.pyqtSignal(str, str)
    updateTriggered = QtCore.pyqtSignal()

    def __init__(self, parent = None):
        super().__init__(parent)
        ui = Ui_FileSelect()
        ui.setupUi(self)
        self._ui = ui
        ui.run.clicked.connect(self.onRun)
        ui.localPath.setText(os.getcwd())
        ui.update.clicked.connect(self.updateTriggered.emit)
        self._mode = MODE_UPLOAD
        ui.selectDir.clicked.connect(self.onSelectDir)
        ui.selectFile.clicked.connect(self.onSelectFile)
        ui.hide.clicked.connect(self.hide)
        
    def onSelectDir(self):
        path = QtWidgets.QFileDialog.getExistingDirectory(self)
        if path == "":
            return
        self.setLocalPath(path)

    def onSelectFile(self):
        path = self.localPath()
        if path != "":
            path = os.path.dirname(path)

        fn = QtWidgets.QFileDialog.getOpenFileName if self._mode == MODE_UPLOAD else QtWidgets.QFileDialog.getSaveFileName
        path, _ = fn(self, "", path)
        if path == "":
            return
        self.setLocalPath(path)

    def onRun(self):
        ui = self._ui
        localPath = ui.localPath.text()
        remotePath = ui.remotePath.text()
        if remotePath == "":
            QtWidgets.QMessageBox.critical(self, "", "Specify remote path")
            return
        if localPath == "":
            QtWidgets.QMessageBox.critical(self, "", "Specify local path")
            return
        self.triggered.emit(remotePath, localPath)

    def setLocalPath(self, path):
        self._ui.localPath.setText(path)

    def setRemotePath(self, path):
        self._ui.remotePath.setText(path)

    def setMode(self, mode):
        self._mode = mode
        caption = "Download" if mode == MODE_DOWNLOAD else "Upload"
        self.setCaption(caption)
        
    def setCaption(self, caption):
        ui = self._ui
        ui.run.setText(caption)
        ui.group.setTitle(caption)

    def remotePath(self):
        return self._ui.remotePath.text()

    def localPath(self):
        return self._ui.localPath.text()

if __name__ == "__main__":
    app = QtWidgets.QApplication([])
    widget = FileSelect()
    widget.show()
    app.exec_()

