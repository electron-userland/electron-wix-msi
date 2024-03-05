![electron-wix-msi](.github/logo.png)

[![Build status](https://ci.appveyor.com/api/projects/status/s54pty8rve3yemb9?svg=true)](https://ci.appveyor.com/project/felixrieseberg/electron-wix-msi)
[![Coverage Status](https://coveralls.io/repos/github/felixrieseberg/electron-wix-msi/badge.svg?branch=master)](https://coveralls.io/github/felixrieseberg/electron-wix-msi?branch=master)
![TypeScript](https://img.shields.io/badge/typings-included-brightgreen.svg)

## Traditional MSI Installers

Most Electron developers use the official
[windows-installer](https://github.com/electron/windows-installer) to create
Windows installers. It does not require Administrator privileges and comes
bundled with an automatic updater. If your app targets consumers, it will likely
be the better choice.

However, if you need to create a traditional MSI the way Microsoft intended for
software to be installed, this module is your friend. It creates a standalone
MSI that installs your application to `Program Files` or any user-defined
directory, much like the installers for Office, Node.js, or other popular apps.
It allows up- and downgrades. For more details, see:
[Should I use this?](#should-i-use-this)

## Look & Feel

<p align="center"><img src="https://github.com/felixrieseberg/electron-wix-msi/raw/master/.github/installer.gif" alt="Installer GIF"></p>

## Prerequisites

Before using this module, make sure to
[install the Wix toolkit v3](http://wixtoolset.org/releases/). Only the command
line tools are required. If you are using AppVeyor or another Windows CI system,
it is likely already installed.

```
npm i --save-dev electron-wix-msi
```

## Whats new?
Version 3 is a major release for this toolkit. Many internals were reworked and V3 
delivers improvements listed below. Please look out for the **🆕 icon throughout this
documentation for new parameter. Versions 4 and above are only adding features
and requiring newer versions of Node.js without actually requiring any code changes on
your part.

See the CHANGELOG.md for details.

### New install folder structure
A new folder structure allows to update the MSI installation while your app is running
without temporarily corrupting the installation. If files are locked during an update
then the MSI engine schedules file operation after the next reboot. While files that are
not locked will be overwritten immediately. That can cause unexpected behavior of your
app. The version-based folder structure avoids these problems and leads to a more robust
user experience.
``` js
C:\Program Files\
└─ Kittens
     └─ app-x.x.x // version of the MSI
     └─ .installInfo // contains information about the installation
     └─ kittens.exe // stub executable that launches the newest version
     └─ Update.exe // optional auto updater 
```
### Auto launch feature
Auto updating was a long missing feature for MSIs. No more!. The integration of special
Squirrel.Windows version allows us to enable auto-updating. This feature is optional
and can be enabled/disabled at package time, install time and can even be controlled 
at run time of your App. See [end user documentation](guides/enduser.md)

### Auto update feature
Auto updating was a long missing feature for MSIs. No more! The integration of a special
Squirrel.Windows version allows us to enable auto-updating. This feature is completely
optional and can be enabled/disabled at package time, install time and can even be controlled 
at run time of your App.

### Desktop shortcut
Your App will now also have a shortcut on the Desktop. 

## Usage

Creating an installer is a three-step process:

``` js
import { MSICreator } from 'electron-wix-msi';

// Step 1: Instantiate the MSICreator
const msiCreator = new MSICreator({
  appDirectory: '/path/to/built/app',
  description: 'My amazing Kitten simulator',
  exe: 'kittens',
  name: 'Kittens',
  manufacturer: 'Kitten Technologies',
  version: '1.1.2',
  outputDirectory: '/path/to/output/folder'
});

// Step 2: Create a .wxs template file
const supportBinaries = await msiCreator.create();

// 🆕 Step 2a: optionally sign support binaries if you
// sign you binaries as part of of your packaging script
supportBinaries.forEach(async (binary) => {
  // Binaries are the new stub executable and optionally
  // the Squirrel auto updater.
  await signFile(binary);
});

// Step 3: Compile the template to a .msi file
await msiCreator.compile();
```

### Configuration

* `appDirectory` (string) - The source directory for the installer, usually the
  output of
  [electron-packager](https://github.com/electron-userland/electron-packager).
* `outputDirectory` (string) - The output directory. Will contain the finished
  `msi` as well as the intermediate files .`wxs` and `.wixobj`.
* `exe` (string) - The name of the exe.
* `description` (string) - The app's description.
* `version` (string) - The app's version.
* `name` (string) - The app's name.
* `icon` 🆕 (string, optional) - A path to the Apps icon used for the stub executable.
   If not provided a lower quality version will be extracted form the `exe`
* `manufacturer` (string) - Name of the manufacturer.

* `appUserModelId` (string, optional) - String to set as `appUserModelId` on the
  shortcut. If none is passed, it'll be set to `com.squirrel.(Name).(exe)`,
  which should match the id given to your app by Squirrel.
* `shortName` (optional, string) - A short name for the app, used wherever
  spaces and special characters are not allowed. Will use the name if left
  undefined.
* `shortcutFolderName` (string, optional) - Name of the shortcut folder in the
  Windows Start Menu. Will use the manufacturer field if left undefined.
* `shortcutName` (string, optional) - Name of the shortcut  in the
  Windows Start Menu. Will use the app's name field if left undefined.
* `programFilesFolderName` (string, optional) - Name of the folder your app will
  live in. Will use the app's name if left undefined.
* `upgradeCode` (string, optional) - A unique UUID used by your app to identify
  itself. This module will generate one for you, but it is important to reuse it
  to enable conflict-free upgrades.
* `cultures` (string, optional) - Specify a specific culture for `light.exe` to
  build using the culture switch e.g `en-us`.
* `language` (number, optional) - The
  [Microsoft Windows Language Code identifier](https://msdn.microsoft.com/en-us/library/cc233965.aspx)
  used by the installer. Will use 1033 (English, United-States) if left
  undefined.
* `extensions` (array, optional) - Specify WiX extensions to use e.g `['WixUtilExtension', 'C:\My WiX Extensions\FooExtension.dll']`
* `lightSwitches` (array, optional) - Specify command line options to pass to light.exe e.g. `['-sval', '-ai']`
  Used to activate `PropertyGroup` options as specified in the [Light Task](https://wixtoolset.org/documentation/manual/v3/msbuild/task_reference/light.html) documentation. 
* `ui` (UIOptions, optional) - Enables configuration of the UI. See below for
  more information.
* `arch` (string, optional) - Defines the architecture the MSI is build for. Values can
  be either `x86` or `x64`. Default's to `x86` if left undefined.
* `features` 🆕 (Feature , optional) - Enables/disables features that will be built-in 
  to the MSI `autoUpdate: boolean` and `autoLaunch: boolean`. These features will be
  then selectable by the end-user during the installation.
  * `autoUpdate` (boolean) - indicates whether the auto-updater is available as an
    install feature
  * `autoLaunch` (boolean) - indicates whether the launch on login is available as an
    install feature
* `windowsSign` - Configuration options to sign the resulting `.msi` file. Accepts all
   [`@electron/windows-sign`][] options.
* `certificateFile` (string, optional, deprecated) - The path to an Authenticode Code
  Signing Certificate. Use `windowsSign` instead.
* `certificatePassword` (string, optional, deprecated) - The password to decrypt the
  certificate given in `certificateFile`. Use `windowsSign` instead.
* `signWithParams` (string, optional, deprecated) - Parameters to pass to `signtool.exe`.
  Overrides `certificateFile` and `certificatePassword`. Use `windowsSign` instead.

##### UI Configuration (Optional)

The `ui` property in the options passed to the installer instance allows more
detailed configuration of the UI. It has the following optional properties:

* `enabled` (boolean, optional) - Whether to show a typical user interface.
  Defaults to `true`. If set to `false`, Windows will show a minimal "Windows is
  configuring NAME_OF_APP" interface.
* `template` (string, optional) - Substitute your own XML that will be inserted
  into the final `.wxs` file before compiling the installer to customize the UI
  options.
* `chooseDirectory` (boolean, optional) - If set to `true`, the end user will be
  able to choose the installation directory. Set to `false` by default. Without
  effect if a custom `template` is used.
* `localizations` (string[], optional) - Provide an array of paths to `.wxl` files containing the localizations.
* `images` (Optional) - Overwrites default installer images with custom files. I
  recommend JPG.
  * `background` - (optional, string) 493 x 312 Background bitmap used on the
    welcome and completion dialogs. Will be used as `WixUIDialogBmp`.
  * `banner` - (optional, string) 493 × 58 Top banner used on most dialogs that
    don't use `background`. Will be used as `WixUIBannerBmp`.
  * `exclamationIcon` - (optional, string) 32 x 32 Exclamation icon on the
    `WaitForCostingDlg` dialog. Will be used as `WixUIExclamationIco`.
  * `infoIcon` - (optional, string) 32 x 32 Information icon on the cancel and
    error dialogs. Will be used as `WixUIInfoIco`.
  * `newIcon` - (optional, string) 16 x 16 "New folder" icon for the "browse"
    dialog. Will be used as `WixUINewIco`.
  * `upIcon` - (optional, string) 16 x 16 "Up" icon for the "browse" dialog.
    Will be used as `WixUIUpIco`.

##### Template Configuration (Optional)

This module uses XML bulding blocks to generate the final `.wxs` file. After
instantiating the class, but before calling `create()`, you can change the
default XML. The available fields on the class are:

* `componentTemplate` (string) - Used for `<Component>` elements. One per file.
* `componentRefTemplate` (string) - Used for `<ComponentRef>` elements. Again,
  one per file.
* `directoryTemplate` (string) - Used for `<Directory>` elements. This module
  does not use `<DirectoryRef>` elements.
* `wixTemplate` (string) - Used as the master template.
* `uiTemplate` (string) - Used as the master UI template.
* `backgroundTemplate` (string) - Used as the background template.

## 🆕 [End user documentation](guides/enduser.md)


## License

MIT, please see LICENSE.md for details.


[`@electron/windows-sign`]: https://github.com/electron/windows-sign
