import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAgentContext } from "@/context/AgentContext";
import { AgentProvider, PROVIDER_DEFAULT_BASE_URL } from "@/types/agent";

/**
 * Agent 配置区块（Provider 选择 / Base URL / API Key），
 * 从 ConfigPanel 中拆分出来以降低单文件行数。
 */
export function AgentConfigSection() {
  const { state: agentState, dispatch: agentDispatch } = useAgentContext();
  const [showApiKey, setShowApiKey] = useState(false);

  const PROVIDER_LABELS: Record<AgentProvider, string> = {
    anthropic: "Anthropic",
    openrouter: "OpenRouter",
    custom: "自定义",
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Agent 配置</p>

      {/* Provider 选择 */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">API Provider</p>
        <div className="grid grid-cols-3 gap-1.5">
          {(["anthropic", "openrouter", "custom"] as AgentProvider[]).map((p) => {
            const active = agentState.config.provider === p;
            return (
              <button
                key={p}
                onClick={() => {
                  const defaultUrl = PROVIDER_DEFAULT_BASE_URL[p];
                  agentDispatch({
                    type: "SET_CONFIG",
                    payload: {
                      provider: p,
                      baseUrl: p === "custom"
                        ? agentState.config.baseUrl
                        : defaultUrl,
                    },
                  });
                }}
                className={`py-1.5 rounded-md border text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {PROVIDER_LABELS[p]}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground/70 leading-relaxed">
          {agentState.config.provider === "anthropic" && "使用系统认证（claude auth login），留空 API Key 即可。"}
          {agentState.config.provider === "openrouter" && "通过 OpenRouter 中转访问 Claude，Base URL 已自动填入，可替换为自建中转地址。"}
          {agentState.config.provider === "custom" && "自定义 Anthropic 兼容 API 端点，适用于企业代理或私有网关。"}
        </p>
      </div>

      {/* Base URL — Anthropic 直连时隐藏 */}
      {agentState.config.provider !== "anthropic" && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            {agentState.config.provider === "openrouter" ? "中转地址 (Base URL)" : "Base URL"}
          </p>
          <Input
            value={agentState.config.baseUrl ?? ""}
            onChange={(e) =>
              agentDispatch({ type: "SET_CONFIG", payload: { baseUrl: e.target.value } })
            }
            placeholder={
              agentState.config.provider === "openrouter"
                ? "https://your-relay.example.com"
                : "https://api.example.com/v1"
            }
            className="h-7 text-xs font-mono"
          />
          {agentState.config.provider === "openrouter" && (
            <p className="text-xs text-muted-foreground/60">
              直连 OpenRouter 填 https://openrouter.ai/api/v1，自建中转填中转地址
            </p>
          )}
        </div>
      )}

      {/* API Key */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">
          {agentState.config.provider === "openrouter" ? "OpenRouter API Key" : "API Key"}
          {agentState.config.provider === "anthropic" && (
            <span className="ml-1 text-muted-foreground/60">（可选，留空使用系统认证）</span>
          )}
        </p>
        <div className="relative">
          <Input
            type={showApiKey ? "text" : "password"}
            value={agentState.config.apiKey ?? ""}
            onChange={(e) =>
              agentDispatch({ type: "SET_CONFIG", payload: { apiKey: e.target.value } })
            }
            placeholder={
              agentState.config.provider === "openrouter"
                ? "sk-or-v1-..."
                : "sk-ant-..."
            }
            className="h-7 text-xs font-mono pr-8"
          />
          <button
            type="button"
            onClick={() => setShowApiKey((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
