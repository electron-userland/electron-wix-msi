import Shell from 'node-powershell';

export const getRegistryKeyValue = async (registryPath: string, registryKey: string) => {
  const ps = new Shell({
    executionPolicy: 'Bypass',
    noProfile: true
  });
  let result = '';
  try {
    ps.addCommand(`Get-ItemPropertyValue '${registryPath}' -Name ${registryKey}`);
    result = await ps.invoke();
  } finally {
    ps.dispose();
  }

  return result.replace(/(\r\n|\n|\r)/gm, '');
};
