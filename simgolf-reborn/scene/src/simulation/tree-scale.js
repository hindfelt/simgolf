// Shared by visible vegetation and shot/trunk collision dimensions.
export function treeScale(environment,x,z,planted=false){
 if(environment!=='desert')return 1;
 return planted ? .6 : .38 + Math.abs(Math.sin(x*7+z*3))*.22;
}
