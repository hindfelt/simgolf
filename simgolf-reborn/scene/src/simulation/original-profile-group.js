// 0x46c140–0x46c16b: actor profile index (+0xb6), profile byte (+0x21).
// This is a binary profile classification, not a golf score. Keep the raw
// grouping name until its presentation meaning is independently established.
export function originalProfileGroup(actorId,profiles) {
 const index=profiles.profileIndexFor(actorId);
 const value=profiles.profileByteAt(index);
 if(!Number.isInteger(value)||value<0||value>255)throw Error('Invalid original profile classification byte.');
 return ((~value)>>>7)&1;
}
