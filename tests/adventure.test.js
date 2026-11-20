import test from 'node:test';
import assert from 'node:assert/strict';
import {
  levels, makeWorld, shortestPath, dig, advance, advanceTurn, collect, completed,
  fireStone, advanceStone, dogScale, teleport, completeStageProgress,
  encodeCampaignSave, decodeCampaignSave,
} from '../adventure.js';

const emptyWorldSaves = () => Array(levels.length).fill(null);

function makeSaveFixture() {
  const world = makeWorld(levels[0]);
  const player = { x: 2, y: 1 };
  const record = {
    cells: world.cells.map(row => row.join('')),
    bones: world.bones.map(({ x, y }) => ({ x, y })),
    predators: world.predators.map(({ x, y, kind }) => ({ x, y, kind })),
  };
  const worlds = emptyWorldSaves();
  worlds[0] = record;
  return {
    stage: 0,
    state: 'playing',
    lives: 2,
    score: 135,
    player,
    direction: { x: 1, y: 0 },
    nextStage: 0,
    finishedStages: [4],
    worlds,
  };
}

test('a campanha tem 15 cenários distintos e cada um traz objetivos e predadores', () => {
  assert.equal(levels.length, 15);
  assert.equal(new Set(levels.map(level => level.name)).size, 15);
  for (const level of levels) {
    assert.equal(level.layout.length, 10);
    assert.ok(level.layout.every(row => row.length === 16));
    const world = makeWorld(level);
    assert.ok(world.start && world.exit);
    assert.equal(world.bones.length, 3);
    assert.ok(world.predators.length >= 2);
  }
});

test('em cada cenário ossos e saída são alcançáveis após abrir as paredes quebráveis e cavar terra', () => {
  for (const level of levels) {
    const world = makeWorld(level);
    for (const goal of [...world.bones, world.exit]) {
      assert.ok(shortestPath(world.cells, world.start, goal).length > 0, `${level.name} -> ${goal.x},${goal.y}`);
    }
  }
});

test('cavar abre terra e andar não atravessa parede', () => {
  const world = makeWorld(levels[0]);
  const player = { x: 4, y: 2 };
  world.cells[2][5] = 'D';
  assert.equal(dig(world, player, { x: 1, y: 0 }), true);
  assert.equal(advance(world, player, { x: 1, y: 0 }), true);
  assert.equal(advance(world, player, { x: 1, y: 0 }), true);
  world.cells[player.y][player.x + 1] = '#';
  assert.equal(advance(world, player, { x: 1, y: 0 }), false);
});

test('ossos são coletados uma vez e saída só abre com todos', () => {
  const world = makeWorld(levels[0]);
  const player = { ...world.exit };
  assert.equal(completed(world, player), false);
  for (const bone of [...world.bones]) {
    assert.equal(collect(world, bone), true);
    assert.equal(collect(world, bone), false);
  }
  assert.equal(completed(world, player), true);
});

test('pedra quebra uma parede interna, mantendo os limites externos', () => {
  const world = makeWorld(levels[0]);
  const player = { x: 4, y: 3 };
  assert.equal(world.cells[3][5], '#');
  const stone = fireStone(world, player, { x: 1, y: 0 });
  assert.equal(advanceStone(world, stone), 'wall');
  assert.equal(world.cells[3][5], '.');
  const edge = fireStone(world, { x: 1, y: 1 }, { x: -1, y: 0 });
  assert.equal(advanceStone(world, edge), 'edge');
  assert.equal(world.cells[1][0], '#');
});

test('pedra remove predador e o acerto pode pontuar e aumentar o cachorro', () => {
  const world = makeWorld(levels[0]);
  world.cells[4][5] = '.';
  world.predators = [{ x: 6, y: 4, kind: '🐺' }];
  const stone = fireStone(world, { x: 5, y: 4 }, { x: 1, y: 0 });
  assert.equal(advanceStone(world, stone), 'enemy');
  assert.equal(world.predators.length, 0);
  assert.equal(dogScale(0), 1);
  assert.equal(dogScale(100), 1.12);
  assert.equal(dogScale(1000), 1.75);
});

test('espirais têm pares entre cenários e transportam o cachorro à outra entrada', () => {
  for (const index of [2, 4, 11]) {
    const world = makeWorld(levels[index]);
    const portal = world.portals[0];
    assert.ok(portal);
    const trip = teleport(levels, index, { x: portal.x, y: portal.y });
    assert.ok(trip);
    assert.notEqual(trip.stage, index);
    assert.deepEqual(trip.player, { x: portal.to.x, y: portal.to.y });
  }
});

test('predadores só avançam quando um passo real do jogador é aceito', () => {
  const world = makeWorld(levels[0]);
  const player = { ...world.start };
  world.predators = [{ x: 4, y: 1, kind: '🐺' }];
  const before = world.predators.map(p => ({ x: p.x, y: p.y }));

  world.cells[1][2] = '#';
  assert.equal(advanceTurn(world, player, { x: 1, y: 0 }), false);
  assert.deepEqual(world.predators.map(p => ({ x: p.x, y: p.y })), before);
  assert.deepEqual(player, { x: 1, y: 1 });

  world.cells[1][2] = '.';
  assert.equal(advanceTurn(world, player, { x: 1, y: 0 }), true);
  assert.deepEqual(player, { x: 2, y: 1 });
  assert.deepEqual(world.predators.map(p => ({ x: p.x, y: p.y })), [{ x: 3, y: 1 }]);
  // With no further player-step call, the turn state is unchanged.
  const stopped = world.predators.map(p => ({ x: p.x, y: p.y }));
  assert.deepEqual(world.predators.map(p => ({ x: p.x, y: p.y })), stopped);
});

test('a campanha percorre cada uma das 15 fases uma vez e termina somente após a última', () => {
  const order = [7, 0, 14, 3, 10, 2, 12, 4, 8, 1, 13, 6, 11, 5, 9];
  let finished = [];
  for (let i = 0; i < order.length; i++) {
    const result = completeStageProgress(finished, order[i]);
    finished = result.finishedStages;
    if (i < 14) {
      assert.equal(result.state, 'next');
      assert.ok(Number.isInteger(result.nextStage));
      assert.ok(!finished.includes(result.nextStage));
    } else {
      assert.equal(result.state, 'won');
      assert.equal(result.nextStage, null);
    }
  }
  assert.deepEqual(finished, [...Array(15).keys()]);
  const duplicate = completeStageProgress(finished, 7);
  assert.equal(duplicate.finishedStages.length, 15);
  assert.equal(duplicate.state, 'won');
});

test('progresso pode ser serializado e restaurado após recarregar', () => {
  const snapshot = makeSaveFixture();
  const restored = decodeCampaignSave(encodeCampaignSave(snapshot));
  assert.ok(restored);
  assert.equal(restored.stage, 0);
  assert.equal(restored.state, 'playing');
  assert.equal(restored.lives, 2);
  assert.equal(restored.score, 135);
  assert.deepEqual(restored.player, { x: 2, y: 1 });
  assert.deepEqual(restored.finishedStages, [4]);
  assert.deepEqual(restored.worlds[0], snapshot.worlds[0]);
  assert.equal(restored.worlds[1], null);

  restored.worlds[0].cells[1] = 'changed';
  assert.notEqual(snapshot.worlds[0].cells[1], 'changed');
});

test('estado de passagem entre fases e campanha concluída também podem ser restaurados', () => {
  const snapshot = makeSaveFixture();
  snapshot.state = 'next';
  snapshot.finishedStages = [0, 4];
  snapshot.nextStage = 1;
  assert.equal(decodeCampaignSave(encodeCampaignSave(snapshot))?.state, 'next');

  snapshot.state = 'won';
  snapshot.finishedStages = [...Array(15).keys()];
  snapshot.nextStage = 0;
  const restored = decodeCampaignSave(encodeCampaignSave(snapshot));
  assert.equal(restored?.state, 'won');
  assert.equal(restored?.finishedStages.length, 15);
});

test('payload de progresso corrompido ou incompatível é ignorado com segurança', () => {
  const original = makeSaveFixture();
  assert.equal(decodeCampaignSave('{invalid'), null);
  assert.equal(decodeCampaignSave(JSON.stringify({ ...original, version: 99 })), null);
  assert.equal(decodeCampaignSave(encodeCampaignSave({ ...original, stage: 15 })), null);
  assert.equal(decodeCampaignSave(encodeCampaignSave({ ...original, finishedStages: [15] })), null);
  const badWorld = makeSaveFixture();
  badWorld.worlds[0].cells.pop();
  assert.equal(decodeCampaignSave(encodeCampaignSave(badWorld)), null);
  const missingWorld = makeSaveFixture();
  missingWorld.worlds[0] = null;
  assert.equal(decodeCampaignSave(encodeCampaignSave(missingWorld)), null);
});
