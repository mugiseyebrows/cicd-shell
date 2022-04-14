# -*- coding: utf-8 -*-

# Form implementation generated from reading ui file 'fileselect.ui'
#
# Created by: PyQt5 UI code generator 5.12.3
#
# WARNING! All changes made in this file will be lost!


from PyQt5 import QtCore, QtGui, QtWidgets


class Ui_FileSelect(object):
    def setupUi(self, FileSelect):
        FileSelect.setObjectName("FileSelect")
        FileSelect.resize(503, 100)
        self.verticalLayout = QtWidgets.QVBoxLayout(FileSelect)
        self.verticalLayout.setObjectName("verticalLayout")
        self.group = QtWidgets.QGroupBox(FileSelect)
        self.group.setObjectName("group")
        self.gridLayout_2 = QtWidgets.QGridLayout(self.group)
        self.gridLayout_2.setObjectName("gridLayout_2")
        self.label_2 = QtWidgets.QLabel(self.group)
        self.label_2.setObjectName("label_2")
        self.gridLayout_2.addWidget(self.label_2, 0, 0, 1, 1)
        self.remotePath = QtWidgets.QLineEdit(self.group)
        self.remotePath.setObjectName("remotePath")
        self.gridLayout_2.addWidget(self.remotePath, 0, 1, 1, 1)
        self.label_5 = QtWidgets.QLabel(self.group)
        self.label_5.setObjectName("label_5")
        self.gridLayout_2.addWidget(self.label_5, 1, 0, 1, 1)
        self.localPath = QtWidgets.QLineEdit(self.group)
        self.localPath.setObjectName("localPath")
        self.gridLayout_2.addWidget(self.localPath, 1, 1, 1, 1)
        self.selectFile = QtWidgets.QPushButton(self.group)
        self.selectFile.setObjectName("selectFile")
        self.gridLayout_2.addWidget(self.selectFile, 1, 2, 1, 1)
        self.selectDir = QtWidgets.QPushButton(self.group)
        self.selectDir.setObjectName("selectDir")
        self.gridLayout_2.addWidget(self.selectDir, 1, 3, 1, 1)
        self.run = QtWidgets.QPushButton(self.group)
        self.run.setObjectName("run")
        self.gridLayout_2.addWidget(self.run, 1, 4, 1, 1)
        self.update = QtWidgets.QPushButton(self.group)
        self.update.setObjectName("update")
        self.gridLayout_2.addWidget(self.update, 0, 2, 1, 1)
        self.hide = QtWidgets.QPushButton(self.group)
        self.hide.setObjectName("hide")
        self.gridLayout_2.addWidget(self.hide, 0, 4, 1, 1)
        self.verticalLayout.addWidget(self.group)

        self.retranslateUi(FileSelect)
        QtCore.QMetaObject.connectSlotsByName(FileSelect)

    def retranslateUi(self, FileSelect):
        _translate = QtCore.QCoreApplication.translate
        FileSelect.setWindowTitle(_translate("FileSelect", "Form"))
        self.group.setTitle(_translate("FileSelect", "Download"))
        self.label_2.setText(_translate("FileSelect", "Remote path"))
        self.label_5.setText(_translate("FileSelect", "Local path"))
        self.localPath.setPlaceholderText(_translate("FileSelect", "path"))
        self.selectFile.setText(_translate("FileSelect", "File"))
        self.selectDir.setText(_translate("FileSelect", "Dir"))
        self.run.setText(_translate("FileSelect", "Download"))
        self.update.setText(_translate("FileSelect", "Update"))
        self.hide.setText(_translate("FileSelect", "hide"))


if __name__ == "__main__":
    import sys
    app = QtWidgets.QApplication(sys.argv)
    FileSelect = QtWidgets.QWidget()
    ui = Ui_FileSelect()
    ui.setupUi(FileSelect)
    FileSelect.show()
    sys.exit(app.exec_())
