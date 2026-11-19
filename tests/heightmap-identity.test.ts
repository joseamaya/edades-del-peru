import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { ARICA_HEIGHTMAP } from '../src/model/defs/aricaHeightmap';
import { CARAL_HEIGHTMAP } from '../src/model/defs/caralHeightmap';
import { CHANCA_HEIGHTMAP } from '../src/model/defs/chancaHeightmap';
import { CHAVIN_HEIGHTMAP } from '../src/model/defs/chavinHeightmap';
import { CHIMU_HEIGHTMAP } from '../src/model/defs/chimuHeightmap';
import { COLONIAL_HEIGHTMAP } from '../src/model/defs/colonialHeightmap';
import { INDEPENDENCE_HEIGHTMAP } from '../src/model/defs/independenceHeightmap';
import { JUNTA_HEIGHTMAP } from '../src/model/defs/juntaHeightmap';
import { LIMA_HEIGHTMAP } from '../src/model/defs/limaHeightmap';
import { MOCHE_HEIGHTMAP } from '../src/model/defs/mocheHeightmap';
import { TAMBOTOCO_HEIGHTMAP } from '../src/model/defs/tambotocoHeightmap';
import { WARI_HEIGHTMAP } from '../src/model/defs/wariHeightmap';

/** SHA-256 of the Float32Array bytes at the migration commit; pins the lossless decode. */
const EXPECTED: Record<string, string> = {
  arica: 'dccbc50f8c0ef8d26d75752dc7e4f5f00da1eba292fd719c17a028ba28d518a6',
  caral: '36ec7f5844486dd763a7aa81a9c0c64f8c2076bafe2dae55822d11c896f75e93',
  chanca: 'bbd8d0534a82fdd249b139ee0451b439cdc691cf0b23765bc8ac877bed207a14',
  chavin: 'f9efc8ff7916dd1de4959d76beaa1c4d530e16fa3d415ae8f82955689dd33a74',
  chimu: 'df2c5758cfb17b96c242c1bac96b3269de9505136a027da0f07faf591e317040',
  colonial: '61ae5b93223d97c74f5a3b5205b5b4475849e9c405f53cfbcb3758e04950bcfc',
  independence: '3ef1dc4d4d912d3ce8646fe390c756106639f3c404f44e8bd8191d26b353a8da',
  junta: 'af3bfeab230456b3516c21bf18ef046ac830a909651737e64f971a2abde9a03b',
  lima: 'beeb821b5c170a3a3526d2b81817d7a8ed1751365b3a99b7909a206473d26e74',
  moche: '9ea8fbadeb3b356faec3e068128b85e2e528b756a6b6df85c2902b4d1bd8f6e3',
  tambotoco: 'c445e4a92f3d59b21a072b4e765883722ade14c508271aae142d0f7a511576ee',
  wari: 'd67479dacc21e86ac8db369f40b051b95d7a5c092682d1b7aa2077be67d07408',
};

const FIELDS: Record<string, Float32Array> = {
  arica: ARICA_HEIGHTMAP,
  caral: CARAL_HEIGHTMAP,
  chanca: CHANCA_HEIGHTMAP,
  chavin: CHAVIN_HEIGHTMAP,
  chimu: CHIMU_HEIGHTMAP,
  colonial: COLONIAL_HEIGHTMAP,
  independence: INDEPENDENCE_HEIGHTMAP,
  junta: JUNTA_HEIGHTMAP,
  lima: LIMA_HEIGHTMAP,
  moche: MOCHE_HEIGHTMAP,
  tambotoco: TAMBOTOCO_HEIGHTMAP,
  wari: WARI_HEIGHTMAP,
};

describe('authored heightmap identity', () => {
  it('keeps every decoded field bit-identical to the pre-encoding data', () => {
    for (const [name, field] of Object.entries(FIELDS)) {
      const bytes = new Uint8Array(field.buffer, field.byteOffset, field.byteLength);
      expect(createHash('sha256').update(bytes).digest('hex'), name).toBe(EXPECTED[name]);
    }
  });
});
