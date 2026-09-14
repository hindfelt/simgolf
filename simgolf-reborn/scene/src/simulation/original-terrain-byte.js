// Original column-major byte storage at 0x570d38. Neighbor reads use a raw
// linear address, including row aliases. Adjacent memory must be supplied;
// it is not implicitly water, rough, or a clamped edge tile.
export function originalTerrainByte(state,x,z){
 if(!Number.isInteger(x)||!Number.isInteger(z)||!(state.terrain instanceof Uint8Array)||state.terrain.length!==2500)throw Error('Original terrain storage unavailable.');
 const index=Math.imul(x,50)+z;let value;
 if(index>=0&&index<2500)value=state.terrain[index];
 else if(index<0){const prefix=state.terrainPrefix;if(!(prefix instanceof Uint8Array)||index< -prefix.length)throw Error('Original preceding terrain memory unavailable.');value=prefix[prefix.length+index];}
 else {const suffix=state.terrainSuffix;if(!(suffix instanceof Uint8Array)||index-2500>=suffix.length)throw Error('Original following terrain memory unavailable.');value=suffix[index-2500];}
 return (value<<24)>>24;
}
