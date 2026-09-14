// Building labels selected by golf.exe 0x407270; plain and detailed forms.
const names=[
  [
    "sundial",
    " garden sundial"
  ],
  [
    "barn",
    " traditional barn"
  ],
  [
    "Civil War cannon",
    "n authentic Civil War cannon"
  ],
  [
    "stonehenge",
    " ancient stonehenge rock"
  ],
  [
    "water mill",
    "n operating water mill"
  ],
  [
    "rock face",
    "n unusual rock face"
  ],
  [
    "Civil War statue",
    "n authentic Civil War statue"
  ],
  [
    "lighthouse",
    " scenic New England lighthouse"
  ],
  [
    "Buddha",
    " peaceful Buddha"
  ],
  [
    "windmill",
    " Dutch windmill"
  ],
  [
    " historic statue",
    " historic statue"
  ],
  [
    "Easter Island head",
    " haunting Easter Island head"
  ],
  [
    "pagoda",
    " exquisite pagoda"
  ],
  [
    "historic lighthouse",
    "n historic Hatteras lighthouse"
  ],
  [
    "oriental house",
    "n ornate oriental house"
  ],
  [
    "dinosaur tarpit",
    " dusty dinosaur tarpit"
  ],
  [
    "water tower",
    "n unsightly water tower"
  ],
  [
    "radio antenna",
    "n unsightly radio antenna"
  ],
  [
    "oil pump",
    "n unsightly oil pump"
  ]
];
export function originalBuildingDescription(q){
 const state=structuredClone(q.state),id=q.buildingId>>>0;
 if(typeof state.sourceText!=='string')throw Error('Original building description requires a text buffer.');
 const label=id>18?'landmark':names[id][(q.detailed|0)!==0?1:0];
 state.sourceText=state.sourceText.split('\0',1)[0]+label;
 return state;
}
