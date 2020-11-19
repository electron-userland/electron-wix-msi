import { split } from 'lodash';
import Shell from 'node-powershell';

export const launch = async (path: string) => {
  let quotedPath = /^.*"$/.test(path) ? path : `"${path}"`;
  const commandArr = path.split('"');
  let args = '';
  if (commandArr.length > 2) {
    quotedPath = `"${commandArr[1]}"`;
    const psArgArray = commandArr
      .splice(2, commandArr.length)
      .join()
      .trim();
    args = psArgArray.length > 0 ?  `-ArgumentList "${psArgArray}"` : '';
  }
  const ps = new Shell({
    executionPolicy: 'Bypass',
    noProfile: true
  });

  try {
    ps.addCommand(`try { Start-Process ${quotedPath} ${args} -ErrorAction Stop } catch {}`);
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
