import { StringMap } from '../interfaces';
export declare function replaceToFile(input: string, target: string, replacements: StringMap<string>): Promise<string>;
export declare function replaceInString(source: string, replacements: StringMap<string>): string;
