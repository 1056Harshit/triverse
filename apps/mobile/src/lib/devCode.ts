/** Local test mode only: the last OTP the API echoed back, kept in memory (never in a URL). */
let last: { target: string; code: string } | null = null;
export const setDevCode = (target: string, code?: string) => { last = code ? { target, code } : null; };
export const getDevCode = (target: string) => (last?.target === target ? last.code : undefined);
