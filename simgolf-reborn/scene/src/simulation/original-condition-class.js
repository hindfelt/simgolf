// 0x466ea0–0x466ec1: classification of actor word +0x88. Preserve all
// three results; callers may test nonzero without collapsing stored state.
export function originalConditionClass(flags) {
 if(!Number.isInteger(flags)||flags<0||flags>65535)throw Error('Invalid original actor condition word.');
 return flags&0x8000?2:((~flags)>>>14)&1;
}
