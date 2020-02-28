import Shell from 'node-powershell';

export const launch = async (path: string) => {
  const ps = new Shell({
    executionPolicy: 'Bypass',
    noProfile: true
  });

  try {
    ps.addCommand(`try { Start-Process "${path}" -ErrorAction Stop } catch {}`);
    await ps.invoke();
  } finally {
    ps.dispose();
  }
};

export const runs = async (name: string) => {
  const ps = new Shell({
    executionPolicy: 'Bypass',
    noProfile: true
  });

  let process: string;
  try {
    ps.addCommand(`Get-Process ${name.replace('.exe', '')} -ErrorAction SilentlyContinue`);
    process = await ps.invoke();
    process = process.replace(/(\r\n|\n|\r)/gm, '');
  } finally {
    ps.dispose();
  }
  return process !== '';
};

export const getProcessPath = async (name: string) => {
  const ps = new Shell({
    executionPolicy: 'Bypass',
    noProfile: true
  });

  let processPath: string;
  try {
    ps.addCommand(`$p = Get-Process ${name.replace('.exe', '')} -ErrorAction SilentlyContinue | Select -First 1`);
    ps.addCommand(`$p.Path`);
    processPath = await ps.invoke();
    processPath = processPath.replace(/(\r\n|\n|\r)/gm, '');
  } finally {
    ps.dispose();
  }
  return processPath;
};

export const kill = async (name: string) => {
  const ps = new Shell({
    executionPolicy: 'Bypass',
    noProfile: true
  });

  try {
    ps.addCommand(`Get-Process ${name.replace('.exe', '')} -ErrorAction SilentlyContinue | kill -ErrorAction SilentlyContinue`);
    await ps.invoke();
  } finally {
    ps.dispose();
  }
};
