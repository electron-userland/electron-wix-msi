export interface HasBinaryResult {
    has: boolean;
    version: string | null;
}
export declare function hasCandle(): HasBinaryResult;
export declare function hasLight(): HasBinaryResult;
export declare function hasBinary(cmd: string): HasBinaryResult;
