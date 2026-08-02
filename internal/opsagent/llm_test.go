package opsagent

import (
	"os"
	"testing"
)

func TestLoadLLMConfigDeepSeekDefaults(t *testing.T) {
	t.Setenv("FORGE_OPS_PROVIDER", "deepseek")
	t.Setenv("FORGE_OPS_API_KEY", "sk-test")
	os.Unsetenv("FORGE_OPS_BASE_URL")
	os.Unsetenv("FORGE_OPS_MODEL")
	os.Unsetenv("FORGE_OPS_THINKING")
	os.Unsetenv("DEEPSEEK_API_KEY")

	cfg := LoadLLMConfig()
	if cfg.Provider != "deepseek" {
		t.Fatalf("provider=%q", cfg.Provider)
	}
	if cfg.Model != "deepseek-v4-flash" {
		t.Fatalf("model=%q", cfg.Model)
	}
	if cfg.BaseURL != "https://api.deepseek.com" {
		t.Fatalf("base=%q", cfg.BaseURL)
	}
	if !cfg.Enabled() {
		t.Fatal("expected enabled")
	}
	if cfg.Thinking {
		t.Fatal("thinking should default off")
	}
	if got := cfg.chatCompletionsURL(); got != "https://api.deepseek.com/chat/completions" {
		t.Fatalf("url=%q", got)
	}
}

func TestLoadLLMConfigDeepSeekThinking(t *testing.T) {
	t.Setenv("FORGE_OPS_PROVIDER", "deepseek")
	t.Setenv("FORGE_OPS_API_KEY", "sk-test")
	t.Setenv("FORGE_OPS_THINKING", "1")
	cfg := LoadLLMConfig()
	if !cfg.Thinking {
		t.Fatal("expected thinking on")
	}
}

func TestLoadLLMConfigDefaultProviderIsDeepSeek(t *testing.T) {
	os.Unsetenv("FORGE_OPS_PROVIDER")
	t.Setenv("FORGE_OPS_API_KEY", "sk-test")
	cfg := LoadLLMConfig()
	if cfg.Provider != "deepseek" {
		t.Fatalf("provider=%q want deepseek", cfg.Provider)
	}
}
