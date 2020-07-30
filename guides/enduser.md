
# General MSI Administration
The `msi` packages created with this module allow for a wide range of command line parameters. The installer is a "Windows Installer", meaning that the actual installer's logic is part of Windows itself. It supports the following command-line parameters:

## Install Options
`</uninstall | /x>` Uninstalls the product

## Display Options
- `/quiet` Quiet mode, no user interaction
- `/passive` Unattended mode - progress bar only
- `/q[n|b|r|f]` Sets user interface level
  - n No UI
  - b Basic UI
  - r Reduced UI
  - f Full UI (default)
`/help` Help information

## Restart Options
- `/norestart` Do not restart after the installation is complete
- `/promptrestart` Prompts the user for restart if necessary
- `/forcerestart` Always restart the computer after installation

## Logging Options
- `/l[i|w|e|a|r|u|c|m|o|p|v|x|+|!|*] <LogFile>`
  - `i` Status messages
  - `w` Nonfatal warnings
  - `e` All error messages
  - `a` Start up of actions
  - `r` Action-specific records
  - `u` User requests
  - `c` Initial UI parameters
  - `m` Out-of-memory or fatal exit information
  - `o` Out-of-disk-space messages
  - `p` Terminal properties
  - `v` Verbose output
  - `x` Extra debugging information
  - `+` Append to existing log file
  - `!` Flush each line to the log
  - `*` Log all information, except for v and x options
- `/log <LogFile>` Equivalent of /l* <LogFile>

## Update Options
- `/update <Update1.msp>[;Update2.msp]` Applies update(s)

## Repair Options
- `/f[p|e|c|m|s|o|d|a|u|v]` Repairs a product
  - `p` only if file is missing
  - `o` if file is missing or an older version is installed (default)
  - `e` if file is missing or an equal or older version is installed
  - `d` if file is missing or a different version is installed
  - `c` if file is missing or checksum does not match the calculated value
  - `a` forces all files to be reinstalled
  - `u` all required user-specific registry entries (default)
  - `m` all required computer-specific registry entries (default)
  - `s` all existing shortcuts (default)
  - `v` runs from source and recaches local package


# WIX-MSI Specific Administration 

## Controlling features via the INSTALLEVEL property

Each feature has an INSTALLLEVEL associated. If the install level of a feature is less or equal to the INSTALLLEVEL value then the feature will be installed.  The default value is 2. 

**Command-line:**

``` yaml
msiexec /i “<fullpath to msi>” INSTALLLEVEL=<desired level>
    
#Example - Install all features
msiexec /i “C:\temp\kitten.msi” INSTALLLEVEL=3
```
| Install Level | Installed feature                          |
| ------------- | ------------------------------------------ |
| 1             | Main Application                           |
| 2             | Main Feature, Launch On Login              |
| 3             | Main Feature, Launch On Login, Auto Update |


## Controlling features via the ADDLOCAL property

The ADDLOCAL property is another way to control the installed feature from the command line. Unlike the INSTALLLEVEL property, any combination of features can be installed. The property takes a comma-separated list of the internal feature names to install. 

| Display Name     | Internal Name   |
| ---------------- | --------------- |
| Main Application | MainApplication |
| Launch On Login  | AutoLaunch      |
| Auto Updater     | AutoUpdate      |

**Command-line:**
``` yaml
msiexec /i “<fullpath to msi>” /qb ADDLOCAL=<list of features>
    
# Example - Install Main Application and Auto Update
msiexec /i “C:\temp\kitten.msi” ADDLOCAL=MainApplication,AutoUpdate
```

## Controlling the Install Folder

Administrators can choose to not install to ProgramFiles but any other location on disk. The installation target can be set via the APPLICATIONROOTDIRECTORY property.

**Command-line:**
``` yaml
msiexec /i “<fullpath to msi>” /qb APPLICATIONROOTDIRECTORY =<target directory>
    
# Example - Install into ProgramData
msiexec /i “C:\temp\kitten.msi” APPLICATIONROOTDIRECTORY =”C:\ProgramData\Kitten
```


## Controlling the Auto Update Feature via Command Line

### Set NTFS user group
In order to make auto-updating work without prompting for Administrator access, the NTFS access rights for the install folder and Uninstall registry key is modified to allow normal users to write data. The UPDATERUSERGROUP property allows to set the user group that gets write access. Its default value is Users.  This property is only effective if the Auto Updater feature is installed.

**Command-line:**
``` yaml
msiexec /i “<fullpath to msi>” /qb UPDATERUSERGROUP=<NTFS user group>
   
# Example - Install Auto Update and give AuthenticatedUsers rights to update
msiexec /i “C:\temp\kitten.msi” ADDLOCAL=MainApplication,AutoUpdate UPDATERUSERGROUP=AuthenticatedUsers
```

### Install Auto Update and Control Updates
The Auto Updater can be enabled/disabled via a registry key. The registry value AutoUpdate is located under `HKLM\SOFTWARE\Kitten Technologies\Kitten`. This registry can be modified via GPO at any time to enable/disable the Auto Updater. Only if the key exist with a value of 1, auto-updates will be executed. 
If the Auto Updater feature is selected for installation then the key will be set and enabled by default. However, the Auto Updater can also be installed but stay disabled. The MSI property AUTOUPDATEENABLED can set the initial value in the registry. 

**Command-line:**
``` yaml
msiexec /i “<fullpath to msi>” /qb AUTOUPDATEENABLED=<desired state>
    
# Example - Install Auto Update but keep updates disabled
msiexec /i “C:\temp\kitten.msi” INSTALLLEVEL=MainApplication,AutoUpdate AUTOUPDATEENABLED=0
```


Controlling the Auto Update feature via command line

Set NTFS user group
In order to make auto-updating work without prompting for Administrator access, the NTFS access rights for the install folder and Uninstall registry key is modified to allow normal users to write data. The UPDATERUSERGROUP property allows to set the user group that gets write access. Its default value is Users.  This property is only effective if the Auto Updater feature is installed.

**Command-line:**
``` yaml
msiexec /i “<fullpath to msi>” /qb UPDATERUSERGROUP=<NTFS user group>
    
# Example - Install Auto Update and give AuthenticatedUsers rights to update
msiexec /i “C:\temp\kitten.msi” ADDLOCAL=MainApplication,AutoUpdate UPDATERUSERGROUP=AuthenticatedUsers
```

Install Auto Update and control updates
The Auto Updater can be enabled/disabled via a registry key. The registry value AutoUpdate is located under `HKLM\SOFTWARE\Kitten Technologies\Kitten`. This registry can be modified via GPO at any time to enable/disable the Auto Updater. Only if the key exist with a value of 1, auto-updates will be executed. 
If the Auto Updater fature is selected for installation then the key will be set and enabled by default. However, the Auto Updater can also be installed but stay disabled. The MSI property AUTOUPDATEENABLED can set the initial value in the registry. 


**Command-line:**
``` yaml
msiexec /i “<fullpath to msi>” /qb AUTOUPDATEENABLED=<desired state>
   
# Example - Install Auto Update but keep updates disabled
msiexec /i “C:\temp\kitten.msi” INSTALLLEVEL=MainApplication,AutoUpdate AUTOUPDATEENABLED=0
```

## Installer Package Registration

The new MSI registered two installation in the Uninstall registry key `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`.


1. Kitten (Machine - MSI)” - Is the actual MSI package registered by the MSI engine. This one will not be visible to the end user in Settings → Apps & Features.  Since the MSI package registration is managed by the MSI install engine it will keep the initial version string given at install time even though a newer version of the App might have been installed by the Auto Updater.
2. Kitten (Machine)” - Is a custom registration visible under Apps & Features. It is designed to be updatable by the Auto Updater and will show the correct current version after each auto update.

While only one is visible to the end user, both can be queried for inventory and management purposes. Calling the uninstall of either one will uninstall Kitten and de-register both.

``` yaml
    Get-Package -Name Kitten*
    
    # outputs
    Name                           Version            ProviderName
    ----                           -------            ------------
    Kitten (Machine)                1.2.3              Programs
    Kitten (Machine - MSI)          1.0.0              msi
```
