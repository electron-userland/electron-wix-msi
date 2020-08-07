import Shell from 'node-powershell';

export const getRegistryKeyValue = async (registryKey: string, registryValue: string) => {
  const ps = new Shell({
    executionPolicy: 'Bypass',
    noProfile: true
  });
  let result = '';
  try {
    ps.addCommand(`Get-ItemPropertyValue '${registryKey}' -Name ${registryValue}`);
    result = await ps.invoke();
  } finally {
    ps.dispose();
  }
  return result.replace(/(\r\n|\n|\r)/gm, '');
};

export const registryKeyExists = async (registryKey: string) => {
  const ps = new Shell({
    executionPolicy: 'Bypass',
    noProfile: true
  });
  let result = '';
  try {
    ps.addCommand(`Test-Path '${registryKey}'`);
    result = await ps.invoke();
  } finally {
    ps.dispose();
  }
  return result.replace(/(\r\n|\n|\r)/gm, '') === 'True';
};
