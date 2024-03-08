# 5.1.3
 * Fix: Only set `windowsSign` if indicated

# 5.1.2
 * Fix: Require correct exe-icon-extractor package

# 5.1.0
 * Feature: Codesigning can now be performed with the `windowsSign` property and will
   be performed by `@electron/windows-sign`. Existing codesign properties
   are deprecated but still supported.
 * Feature: Associate extensions with exe (thanks to @lafleurh).
 * Fix: Better support for semantic version to Windows version (thanks to @lafleurh).
 * Updated various dependencies (non-breaking).
 * Upgraded developer dependencies.

# 5.0.0

# 4.0.0
 * Breaking: Upgraded dependencies, now requiring Node v14+
 * Add localization support

# 3.2.0
 * Write toast activator CLSID in shortcut

# 3.1.0
 * Make `INSTALLLEVEL` & `REBOOT` configurable (thanks to @HKrausAxon)
 * Allow passing of additional parameters to `light.exe` (thanks to @Qazzian)
 * Fix Readme typos (thanks to @pvenky and @trias)\

# 3.0.0
 * Major upgrade to the created MSIs, allowing the creation
   of MSIs that support auto-updates
 * Numerous bug fixes
# 2.0.0
 * Feature: Raise error when trying to sign without a `certificateFile`
 * Feature: Allow custom WiX extensions
 * Fix CNDL0014: Avoid illegal starting characters & ensure id uniqueness
 * Fix: Peer directories were incorrectly identified as children
 * Infra: Update dependencies
 * Infra: Require Node v8
