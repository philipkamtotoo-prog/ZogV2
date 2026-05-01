/**
 * 战斗模拟测试脚本
 * 使用 DeepSeek API 运行一场完整战斗
 *
 * 运行方式: npx tsx src/test-battle.ts
 */

import { createLLMActorBrainProvider } from '../src/llm/llmActorBrainProvider';
import { createStubActorBrainProvider } from '../src/llm/stubActorBrainProvider';
import { createLLMRoleRegistry } from '../src/llm/clients/llmRoleRegistry';
import { runBattleSimulation } from '../src/engine/battleSimulation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DEEPSEEK_API_KEY: string = (globalThis as any).process?.env?.DEEPSEEK_API_KEY ?? '';

async function main() {
  console.log('=== Zog V2 Battle Simulation Test ===\n');

  // 先用 stubActorBrain 测试
  console.log('1. Testing with StubActorBrain...');
  const stubProvider = createStubActorBrainProvider();

  const stubResult = await runBattleSimulation({
    battleSeed: 'test-seed-001',
    actorCount: 5,
    maxActions: 40,
    actorBrainProvider: stubProvider,
    onStateChange: (state) => {
      if (state.actorActionIndex % 10 === 0) {
        console.log(`  Action ${state.actorActionIndex}: ${state.actors.filter(a => a.isAlive).length} actors alive`);
      }
    },
    onEvent: (event) => {
      if (event.type === 'ACTOR_ELIMINATED') {
        console.log(`  ⚔️  ${event.targetActorId} eliminated!`);
      }
    },
  });

  console.log(`\n  Stub Battle Result:`);
  console.log(`  - Total events: ${stubResult.eventCount}`);
  console.log(`  - Winner: ${stubResult.winner?.name}`);
  console.log(`  - Alive actors: ${stubResult.battleState.actors.filter(a => a.isAlive).length}`);

  // 再用 DeepSeek API 测试（如果提供了 API key）
  if (DEEPSEEK_API_KEY) {
    console.log('\n2. Testing with DeepSeek API...');
    console.log('  (This may take a while due to API calls)\n');

    const registry = createLLMRoleRegistry();
    // Override the apiKey for actor_brain role
    const roleConfig = registry.getRoleConfig('actor_brain');
    roleConfig.apiKey = DEEPSEEK_API_KEY;
    roleConfig.baseUrl = 'https://api.deepseek.com';
    roleConfig.model = 'deepseek-v4-flash';
    roleConfig.timeout = 30000;

    const llmProvider = createLLMActorBrainProvider({
      registry,
      timeout: 30000,
      maxRetries: 2,
    });

    try {
      const llmResult = await runBattleSimulation({
        battleSeed: 'test-seed-002',
        actorCount: 3, // 减少演员数以加快测试
        maxActions: 10, // 减少行动数
        actorBrainProvider: llmProvider,
        onStateChange: (state) => {
          console.log(`  Action ${state.actorActionIndex}: ${state.actors.filter(a => a.isAlive).length} actors alive`);
        },
      });

      console.log(`\n  DeepSeek Battle Result:`);
      console.log(`  - Total events: ${llmResult.eventCount}`);
      console.log(`  - Winner: ${llmResult.winner?.name}`);
      console.log(`  - Alive actors: ${llmResult.battleState.actors.filter(a => a.isAlive).length}`);

      // 打印最后几轮的事件
      console.log('\n  Recent events:');
      llmResult.battleState.eventLog.slice(-5).forEach((event) => {
        console.log(`    [${event.type}] ${event.activeActorId}: ${event.line?.slice(0, 50)}`);
      });
    } catch (error) {
      console.error('DeepSeek API test failed:', error);
    }
  } else {
    console.log('\n2. Skipping DeepSeek API test (no API key)');
    console.log('   Set DEEPSEEK_API_KEY environment variable to enable');
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
