import {treeScale} from "../simulation/tree-scale.js";
import * as THREE from "three";
import { GRID, center } from "../simulation/world.js";
import { height, courseHeight } from "../landscape.js";
import { foliageTexture, palmFrondGeometry } from "../flora.js";
export function plantedTrees(scene) {
  const capacity = GRID.width * GRID.height;
  const canopyTexture=foliageTexture();
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.14, 0.26, 4.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x6a573c, roughness: 1 }),
    capacity * 7,
  );
  const leaves = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(2.2, 2.2),
    new THREE.MeshStandardMaterial({
      map: canopyTexture,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 1,
    }),
    capacity * 64,
  );
  for (const m of [trunks, leaves]) {
    m.count = 0;
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  }
  const dummy = new THREE.Object3D();
  let revision = -1, appearance = "";
  const positions = [];
  return {
    pick(raycaster) {
      const hit = raycaster.intersectObjects([trunks,leaves],false)[0];
      if(!hit) return null;
      const p = positions[Math.floor(hit.instanceId / (hit.object === trunks ? 7 : 64))];
      return p ? {...p, distance:hit.distance} : null;
    },
    update(g) {
      const tropical=g.environment==="tropical",links=g.environment==="links";
      const conifer=g.landscapeStyle==="coast" && g.environment!=="desert" && !tropical && !links;
      const nextAppearance=`${g.environment}:${conifer}`;
      if (g.revision === revision && appearance===nextAppearance) return;
      if(appearance!==nextAppearance){leaves.geometry.dispose();leaves.geometry=tropical?palmFrondGeometry():new THREE.PlaneGeometry(2.2,2.2);leaves.material.map=tropical?null:canopyTexture;leaves.material.needsUpdate=true;}
      appearance=nextAppearance;
      revision = g.revision;
      let count = 0;
      positions.length = 0;
      for (const [k, t] of Object.entries(g.tiles)) {
        if (t.type !== "tree") continue;
        const p = center(
            Number(k) % GRID.width,
            Math.floor(Number(k) / GRID.width),
          ),
          ground = courseHeight(g, p.x, p.z);
        positions.push({...p,y:ground});
        dummy.position.set(p.x, ground + 2.25, p.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        trunks.setMatrixAt(count * 7, dummy.matrix);
        for(let b=0;b<6;b++) {
          const angle=b*Math.PI/3,from=new THREE.Vector3(p.x,ground+2.8,p.z),to=new THREE.Vector3(p.x+Math.cos(angle)*1.35,ground+4.8,p.z+Math.sin(angle)*1.35),direction=to.clone().sub(from);
          if(conifer){from.y=ground+2.3+b*.35;to.set(p.x+Math.cos(angle)*(.85-b*.09),from.y-.2,p.z+Math.sin(angle)*(.85-b*.09));direction.copy(to).sub(from);}
          if(tropical){direction.set(0,0,0);}
          dummy.position.copy(from.add(to).multiplyScalar(.5));dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());dummy.scale.set(.45,direction.length()/4.5,.45);dummy.updateMatrix();trunks.setMatrixAt(count*7+b+1,dummy.matrix);
        }
        dummy.scale.set(1,1,1);
        let seed = (Number(k) * 4717 + 61) >>> 0;
        const rand = () => {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          return seed / 4294967296;
        };
        for (let n = 0; n < 64; n++) {
          const angle = rand() * Math.PI * 2,
            r = Math.sqrt(rand()) * 1.55;
          dummy.position.set(
            p.x + Math.cos(angle) * r,
            ground + 4.2 + rand() * 1.8,
            p.z + Math.sin(angle) * r,
          );
          dummy.rotation.set(
            rand() * Math.PI,
            rand() * Math.PI,
            rand() * Math.PI,
          );
          if(conifer){
            const tier=Math.floor(n/8),fraction=tier/8,a=(n%8)*Math.PI/4+tier*.6;
            const radius=1.3-fraction*1.2,spread=1.2-fraction*.85;
            dummy.position.set(p.x+Math.cos(a)*radius*.65,ground+2.2+fraction*3.5,p.z+Math.sin(a)*radius*.65);
            dummy.rotation.set(-.65,a,.3*Math.sin(a));dummy.scale.set(spread,spread*.65,spread);
          }
          if(tropical){dummy.position.set(p.x,ground+4.5,p.z);dummy.rotation.set(0,n*Math.PI/5,0);dummy.scale.setScalar(n<10?.7:0);}
          dummy.updateMatrix();
          leaves.setMatrixAt(count * 64 + n, dummy.matrix);
        }
        count++;
      }
      leaves.material.color.set(tropical ? 0x608d30 : links ? 0x9e9b57 : g.environment==='desert' ? 0xb8b69a : conifer ? 0xc6d8ca : 0xffffff);
      leaves.name=tropical?'planted-palms':links?'planted-gorse':conifer?'planted-coastal-conifers':g.environment==='desert'?'planted-desert-scrub':'planted-broadleaf';
      if(g.environment==='desert'||links){
        const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
        for(const [mesh,parts] of [[trunks,7],[leaves,64]])for(let i=0;i<count*parts;i++){
          const base=positions[Math.floor(i/parts)],shrink=treeScale(g.environment,base.x,base.z,true);
          mesh.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);
          position.set(base.x+(position.x-base.x)*shrink,base.y+(position.y-base.y)*shrink,base.z+(position.z-base.z)*shrink);
          scale.multiplyScalar(shrink);matrix.compose(position,rotation,scale);mesh.setMatrixAt(i,matrix);
        }
      }
      trunks.count = count * 7;
      leaves.count = count * 64;
      for (const m of [trunks, leaves]) {
        m.instanceMatrix.needsUpdate = true;
        m.computeBoundingSphere();
      }
    },
  };
}
