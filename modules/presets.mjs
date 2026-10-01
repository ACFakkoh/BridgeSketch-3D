import { defaults, validate, fitBoxLayoutFromBottom } from './geometry.mjs';

// Seven complete starting concepts; each selection resets every parameter.
export const presets = [
  {
    "id": "river",
    "label": "Summer river · 5 steel spans",
    "description": "Summer evening on five variable-depth green steel spans over open ground and a river.",
    "config": {
      ...defaults,
      "width": 13.2,
      "overhang": 1.3,
      "material": "steel",
      "depth": 1.2,
      "variableDepth": true,
      "pierDepth": 2.1,
      "taper": 35,
      "steelColor": "green",
      "barrierType": "steel",
      "leftRailing": "210A",
      "rightRailing": "210A",
      "lighting": "poles",
      "wingAngle": 35,
      "sidewalkSide": "right",
      "sidewalkWidth": 2,
      "bentWidth": 1.8,
      "bentThickness": 0.9,
      "bentEndThickness": 0.9,
      "columnDiameter": 1.1,
      "elevation": 6.8,
      "approach": 24,
      "seed": 24,
      "spans": [
        {
          "length": 18,
          "obstacle": "land",
          "width": 10,
          "elevation": 0,
          "angle": 90
        },
        {
          "length": 20,
          "obstacle": "water",
          "width": 18,
          "elevation": 0,
          "angle": 90
        },
        {
          "length": 28,
          "obstacle": "water",
          "width": 18,
          "elevation": 0,
          "angle": 90
        },
        {
          "length": 20,
          "obstacle": "water",
          "width": 18,
          "elevation": 0,
          "angle": 90
        },
        {
          "length": 18,
          "obstacle": "land",
          "width": 10,
          "elevation": 0,
          "angle": 90
        }
      ]
    }
  },
  {
    "id": "box",
    "label": "Rainy city · 4 curved boxes",
    "description": "Four curved and skewed steel-box spans; uniform 3% crossfall, roads, railway and open ground.",
    "config": {
      ...defaults,
      "width": 13.6,
      "overhang": 3.75,
      "girders": 2,
      "material": "box",
      "depth": 1.3,
      "variableDepth": true,
      "pierDepth": 2.2,
      "steelColor": "blue",
      "barrierType": "steel",
      "leftRailing": "210C",
      "rightRailing": "210C",
      "sidewalkSide": "right",
      "sidewalkWidth": 2.5,
      "boxTopWidth": 5.1,
      "boxBottomWidth": 3.55,
      "weather": "rain",
      "pierType": "hammerhead",
      "columns": 1,
      "columnDiameter": 1.5,
      "hammerheadWidth": 2.5,
      "skew": 10,
      "curved": true,
      "radius": 160,
      "elevation": 7.4,
      "approach": 25,
      "environment": "urban",
      "sceneWidth": 110,
      "timeOfDay": 14,
      "seed": 31,
      "crossfall": "right",
      "crossSlope": 3,
      "concreteFinish": "light",
      "spans": [
        {
          "length": 24,
          "obstacle": "road",
          "width": 10,
          "elevation": 0,
          "angle": 80
        },
        {
          "length": 32,
          "obstacle": "rail",
          "width": 7,
          "elevation": 0,
          "angle": 90
        },
        {
          "length": 24,
          "obstacle": "road",
          "width": 10,
          "elevation": 0,
          "angle": 100
        },
        {
          "length": 18,
          "obstacle": "land",
          "width": 10,
          "elevation": 0,
          "angle": 90
        }
      ]
    }
  },
  {
    "id": "cycle",
    "label": "Night cycle arch · 1 span",
    "description": "A narrow steel tied arch with cyclists, illuminated SDC railings, physical sky and stars.",
    "config": {
      ...defaults,
      "width": 4.8,
      "overhang": 0.5,
      "girders": 2,
      "material": "steel",
      "depth": 0.8,
      "pierDepth": 1.7,
      "steelColor": "gray16515",
      "barrierType": "steel",
      "leftRailing": "SDC",
      "rightRailing": "SDC",
      "approachBarrier": "extend",
      "lighting": "handrail",
      "lightSpacing": 3,
      "lightColor": "warm",
      "laneCount": 1,
      "boxTopWidth": 3,
      "laneWidth": 1.8,
      "trafficMode": "cyclists",
      "elevation": 6.2,
      "rise": 0.25,
      "approach": 18,
      "sceneWidth": 90,
      "timeOfDay": 22.5,
      "seed": 48,
      "structureSystem": "arch",
      "archType": "tied",
      "archMaterial": "steel",
      "archRise": 0.2,
      "skyModel": "physical",
      "spans": [
        {
          "length": 28,
          "obstacle": "water",
          "width": 15,
          "elevation": 0,
          "angle": 90
        }
      ]
    }
  },
  {
    "id": "psbox",
    "label": "Snow viaduct · 8 spans",
    "description": "Eight prestressed twin-box spans in winter, over roads, railway, river and open ground.",
    "config": {
      ...defaults,
      "width": 16.5,
      "material": "psbox",
      "depth": 2.3,
      "variableDepth": true,
      "pierDepth": 4.2,
      "taper": 32,
      "leftRailing": "311A",
      "rightRailing": "311A",
      "lighting": "poles",
      "lightSides": "right",
      "laneCount": 4,
      "weather": "snow",
      "pierType": "wall",
      "wallThickness": 1.8,
      "curved": true,
      "radius": 520,
      "direction": -1,
      "elevation": 16,
      "rise": 1.1,
      "approach": 45,
      "terrainMode": "snow",
      "sceneWidth": 300,
      "timeOfDay": 9,
      "seed": 61,
      "psboxCount": 2,
      "concreteFinish": "light",
      "spans": [
        {
          "length": 32,
          "obstacle": "land",
          "width": 12,
          "elevation": 0,
          "angle": 90
        },
        {
          "length": 40,
          "obstacle": "road",
          "width": 12,
          "elevation": 0,
          "angle": 80
        },
        {
          "length": 44,
          "obstacle": "rail",
          "width": 8,
          "elevation": 0,
          "angle": 90
        },
        {
          "length": 54,
          "obstacle": "water",
          "width": 34,
          "elevation": 0,
          "angle": 90
        },
        {
          "length": 54,
          "obstacle": "water",
          "width": 34,
          "elevation": 0,
          "angle": 90
        },
        {
          "length": 44,
          "obstacle": "rail",
          "width": 8,
          "elevation": 0,
          "angle": 95
        },
        {
          "length": 40,
          "obstacle": "road",
          "width": 12,
          "elevation": 0,
          "angle": 100
        },
        {
          "length": 32,
          "obstacle": "land",
          "width": 12,
          "elevation": 0,
          "angle": 90
        }
      ]
    }
  },
  {
    "id": "strutted",
    "label": "Autumn béquilles · 3 spans",
    "description": "Three spans on inclined legs, autumn foliage and falling leaves.",
    "config": {
      ...defaults,
      "width": 12.4,
      "material": "psbox",
      "depth": 1.5,
      "variableDepth": true,
      "pierDepth": 3.1,
      "leftRailing": "311",
      "rightRailing": "311",
      "weather": "leaves",
      "elevation": 14,
      "rise": 0.9,
      "approach": 28,
      "terrainMode": "fall",
      "sceneWidth": 200,
      "timeOfDay": 16,
      "seed": 72,
      "structureSystem": "strutted",
      "concreteFinish": "light",
      "spans": [
        {
          "length": 24,
          "obstacle": "road",
          "width": 7,
          "elevation": 0,
          "angle": 90
        },
        {
          "length": 58,
          "obstacle": "water",
          "width": 36,
          "elevation": 0,
          "angle": 90
        },
        {
          "length": 24,
          "obstacle": "road",
          "width": 7,
          "elevation": 0,
          "angle": 90
        }
      ]
    }
  },
  {
    "id": "deck-arch",
    "label": "Sunrise deck arch · 6 spans",
    "description": "Six slab spans carried across a valley by a concrete deck arch, at sunrise.",
    "config": {
      ...defaults,
      "width": 12.4,
      "material": "slab",
      "slabDepth": 1.15,
      "leftRailing": "311A",
      "rightRailing": "311A",
      "pierType": "wall",
      "wallThickness": 1.2,
      "elevation": 26,
      "rise": 0.6,
      "approach": 34,
      "terrainShape": "profile",
      "sceneWidth": 240,
      "timeOfDay": 6.8,
      "seed": 83,
      "structureSystem": "arch",
      "concreteFinish": "light",
      "spans": [
        {
          "length": 18,
          "obstacle": "road",
          "width": 6,
          "elevation": 0,
          "angle": 90
        },
        {
          "length": 18,
          "obstacle": "land",
          "width": 8,
          "elevation": 0,
          "angle": 90
        },
        {
          "length": 96,
          "obstacle": "water",
          "width": 40,
          "elevation": 0,
          "angle": 90
        },
        {
          "length": 18,
          "obstacle": "land",
          "width": 8,
          "elevation": 0,
          "angle": 90
        },
        {
          "length": 22,
          "obstacle": "rail",
          "width": 8,
          "elevation": 0,
          "angle": 90
        },
        {
          "length": 18,
          "obstacle": "road",
          "width": 6,
          "elevation": 0,
          "angle": 90
        }
      ]
    }
  },
  {
    "id": "overpass",
    "label": "TSM overpass · 2 NEBT spans",
    "description": "Two continuous NEBT spans over a divided highway, panelled TSM approach walls, tapered caps and rain at dusk.",
    "config": {
      ...defaults,
      "width": 12.6,
      "overhang": 1.1,
      "depth": 1.6,
      "lighting": "poles",
      "lightSides": "right",
      "weather": "rain",
      "bentWidth": 1.6,
      "bentThickness": 1.1,
      "bentEndThickness": 0.7,
      "bentTaperStart": 3,
      "columns": 3,
      "columnDiameter": 1,
      "elevation": 7.6,
      "rise": 0.35,
      "approach": 38,
      "approachWalls": "mse",
      "sceneWidth": 160,
      "timeOfDay": 17.5,
      "seed": 118,
      "centreLine": "double",
      "concreteFinish": "light",
      "spans": [
        {
          "length": 28,
          "obstacle": "road",
          "width": 11,
          "elevation": 0,
          "angle": 90
        },
        {
          "length": 28,
          "obstacle": "road",
          "width": 11,
          "elevation": 0,
          "angle": 90
        }
      ]
    }
  }
];

export function makePreset(id) {
  const preset = presets.find(p => p.id === id);
  if (!preset) throw Error('Select a bridge preset.');
  const config = structuredClone(preset.config);
  return validate(config.material === 'box' ? fitBoxLayoutFromBottom(config) : config);
}
