import Shell from 'node-powershell';

export const hasAccessRights = async (path: string, userGroup: string) => {
  const ps = new Shell({
    executionPolicy: 'Bypass',
    noProfile: true
  });
  let result = '';
  try {
    ps.addCommand(`$access = Get-Acl -path "${path}" | Select -expand Access`);
    ps.addCommand(`$access = $access | where {$_.IdentityReference -like "*${userGroup}"}`);
    ps.addCommand(`$access | where {$_.FileSystemRights -like "*FullControl"}`);
    result = await ps.invoke();
  } finally {
    ps.dispose();
  }
  return result.replace(/(\r\n|\n|\r)/gm, '').length > 0;
};
