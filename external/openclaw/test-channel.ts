/**
 * 模拟 OpenClaw 环境测试 ChannelPlugin
 */

import { wechatPlugin } from "./src/channel.js";
import type { ClawdbotConfig } from "openclaw/plugin-sdk";

// ===== Mock OpenClaw 配置 =====
const mockConfig: ClawdbotConfig = {
  channels: {
    wechat: {
      accounts: {
        default: {
          enabled: true,
          name: "测试账号",
          apiKey: "wc_live_test_xxxxxxxx",
          deviceType: "ipad",
          proxy: "2",
          webhookPort: 18790,
          // webhookUrl: "https://xxx.ngrok-free.app/webhook/wechat",
        },
      },
    },
  },
} as any;

// ===== Mock OpenClaw API =====
const mockApi = {
  log: {
    info: (msg: string) => console.log(`[INFO] ${msg}`),
    warn: (msg: string) => console.log(`[WARN] ${msg}`),
    error: (msg: string) => console.log(`[ERROR] ${msg}`),
  },

  setStatus: (status: any) => {
    console.log("[STATUS]", status);
  },
};

// ===== 测试配置模块 =====
async function testConfig() {
  console.log("\n📋 测试配置模块\n");

  // 测试 listAccountIds
  console.log("1. listAccountIds:");
  const accountIds = wechatPlugin.config!.listAccountIds!(mockConfig);
  console.log("   账号列表:", accountIds);

  // 测试 resolveAccount
  console.log("\n2. resolveAccount:");
  try {
    const account = await wechatPlugin.config!.resolveAccount!(mockConfig, "default");
    console.log("   账号信息:", {
      accountId: account.accountId,
      enabled: account.enabled,
      configured: account.configured,
      apiKey: account.apiKey.slice(0, 10) + "...",
      deviceType: account.deviceType,
      webhookPort: account.webhookPort,
    });
  } catch (err: any) {
    console.log("   错误:", err.message);
  }

  // 测试 describeAccount
  console.log("\n3. describeAccount:");
  const account = await wechatPlugin.config!.resolveAccount!(mockConfig, "default");
  const description = wechatPlugin.config!.describeAccount!(account);
  console.log("   描述:", description);
}

// ===== 测试状态模块 =====
async function testStatus() {
  console.log("\n📊 测试状态模块\n");

  // 测试 probeAccount
  console.log("1. probeAccount:");
  try {
    const result = await wechatPlugin.status!.probeAccount!({
      cfg: mockConfig,
      accountId: "default",
    });
    console.log("   状态:", result);
  } catch (err: any) {
    console.log("   错误 (预期内，可能代理服务未启动):", err.message);
  }
}

// ===== 测试消息目标解析 =====
async function testMessaging() {
  console.log("\n💬 测试消息模块\n");

  // 测试 normalizeTarget
  console.log("1. normalizeTarget:");
  const testCases = [
    "user:wxid_abc123",
    "group:12345@chatroom",
    "wxid_direct",
    "wxid_xxx@chatroom",
  ];

  for (const target of testCases) {
    const normalized = wechatPlugin.messaging!.normalizeTarget!(target);
    console.log(`   "${target}" ->`, normalized);
  }

  // 测试 targetResolver
  console.log("\n2. targetResolver:");
  const resolver = wechatPlugin.messaging!.targetResolver!;
  console.log("   提示:", resolver.hint);

  const testIds = ["wxid_abc123", "12345@chatroom", "invalid_id"];
  for (const id of testIds) {
    const looksLikeId = resolver.looksLikeId!(id);
    console.log(`   "${id}" 看起来像ID?`, looksLikeId);
  }
}

// ===== 测试网关启动（可选，需要代理服务）=====
async function testGateway() {
  console.log("\n🚀 测试网关模块\n");
  console.log("注意: 这需要代理服务运行，跳过详细测试");

  // 仅检查 gateway 对象存在
  console.log("1. gateway.startAccount 存在?", !!wechatPlugin.gateway?.startAccount);
}

// ===== 测试发送消息（可选，需要代理服务）=====
async function testOutbound() {
  console.log("\n📤 测试发送模块\n");
  console.log("注意: 这需要代理服务和登录状态，跳过详细测试");

  console.log("1. sendText 存在?", !!wechatPlugin.outbound?.sendText);
  console.log("2. sendMedia 存在?", !!wechatPlugin.outbound?.sendMedia);
}

// ===== 主测试流程 =====
async function main() {
  console.log("=".repeat(60));
  console.log("🧪 OpenClaw WeChat 插件本地测试");
  console.log("=".repeat(60));

  try {
    await testConfig();
  } catch (err: any) {
    console.error("配置测试失败:", err.message);
  }

  try {
    await testStatus();
  } catch (err: any) {
    console.error("状态测试失败:", err.message);
  }

  try {
    await testMessaging();
  } catch (err: any) {
    console.error("消息测试失败:", err.message);
  }

  try {
    await testGateway();
  } catch (err: any) {
    console.error("网关测试失败:", err.message);
  }

  try {
    await testOutbound();
  } catch (err: any) {
    console.error("发送测试失败:", err.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ 基础测试完成");
  console.log("=".repeat(60));

  console.log("\n💡 下一步:");
  console.log("   1. 启动代理服务: cd openclaw-wechat-proxy && npm run dev");
  console.log("   2. 运行集成测试: npx tsx test-integration.ts");
  console.log("   3. 或使用 OpenClaw 进行完整测试");
}

main().catch(console.error);
