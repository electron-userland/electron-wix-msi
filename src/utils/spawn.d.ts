/// <reference types="node" />
import { SpawnOptions } from 'child_process';
export interface SpawnPromiseResult {
    stdout: string;
    stderr: string;
    code: number;
}
export declare function spawnPromise(name: string, args: Array<string>, options?: SpawnOptions): Promise<SpawnPromiseResult>;
