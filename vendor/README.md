## MSQ - MSI Squirrel
Binaries in this folder are a special version of the official Squirrel.Windows. They are modified to work seamlessly with MSI installations created by electron-wix-msi V3. MSQ stays compatible with update packages created by the official Squirrel.Windows

### Binaries
- msq.exe = modified Squirrel.Windows executable, a.k.a. Update.exe,
   a.k.a Squirrel.ex
- StubExecutable.exe - Unmodified stub executable
   responsible to launch the app binary with the highest version number
   in the app-x.x.x subfolders.

### What changed compared to the official squirrel
- Packaging has been disabled.
- Installing has been disabled.
- Uninstalling has been disabled.
- Shortcut/Deshortcut has been disabled.
- A bug fix to allow update without local `packages` folder or RELEASE file. This is the case after a fresh install of the MSI and no update has yet been installed.
- Creating an Uninstall registry has been removed. Instead, only the DisplayVersion of in the custom Uninstall registry created by the MSI is updated.

You can find the code of MSQ here [https://github.com/bitdisaster/Squirrel.Msi](https://github.com/bitdisaster/Squirrel.Msi)
