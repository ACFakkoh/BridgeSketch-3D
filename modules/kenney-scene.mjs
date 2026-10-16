import * as T from 'three';
import data from '../models/kenney-scene-data.mjs';

const templates = new Map();
export const buildingStyles = Object.freeze(['building-type-a', 'building-type-g', 'building-a', 'building-j']);

export function kenneyGeometry(name) {
  if (!templates.has(name)) {
    const source = data[name];
    if (!source) throw Error(`Unknown Kenney model: ${name}`);
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(source.positions, 3));
    geometry.setAttribute('normal', new T.Float32BufferAttribute(source.normals, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(source.uvs, 2));
    geometry.setIndex(source.indices);
    templates.set(name, geometry);
  }
  return templates.get(name).clone();
}

export function kenneySize(name) {
  return data[name].size;
}
