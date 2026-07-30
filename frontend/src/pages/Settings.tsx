import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { recommendApi } from '../api/recommend';
import { Button, Card, Input, Select, useToast } from '../components';
import { loadSettings, saveSettings, clearSettings, maskKey } from '../lib/settings';
import type { LlmProvider } from '../types';

const PROVIDERS: Array<{ value: LlmProvider; label: string; placeholder: string; helpUrl: string }> = [
  {
    value: 'minimax',
    label: 'MiniMax',
    placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    helpUrl: 'https://platform.minimax.chat/user-center/basic-information/interface-key',
  },
  {
    value: 'zhipu',
    label: '智谱 GLM',
    placeholder: 'glm-xxxxxxxxxxxxxxxxxxxx',
    helpUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
  },
];

export default function SettingsPage() {
  const initial = loadSettings();
  const [provider, setProvider] = useState<LlmProvider>(initial.llm?.provider ?? 'minimax');
  const [apiKey, setApiKey] = useState(initial.llm?.api_key ?? '');
  const [showKey, setShowKey] = useState(false);
  const toast = useToast();

  const testMut = useMutation({
    mutationFn: () => recommendApi.testLlm(provider, apiKey),
    onSuccess: (res) => {
      if (res.ok) {
        toast.push('success', '连接成功!');
      } else {
        toast.push('error', res.message || '连接失败');
      }
    },
    onError: (e: Error) => toast.push('error', e.message ?? '测试失败'),
  });

  const handleSave = () => {
    if (!apiKey.trim()) {
      clearSettings();
      toast.push('success', '已清空 LLM 设置');
      return;
    }
    if (apiKey.trim().length < 8) {
      toast.push('error', 'API key 格式不对(至少 8 字符)');
      return;
    }
    saveSettings({ llm: { provider, api_key: apiKey.trim() } });
    toast.push('success', '已保存到浏览器 localStorage');
  };

  const handleClear = () => {
    clearSettings();
    setApiKey('');
    toast.push('success', '已清空 LLM 设置');
  };

  const currentProviderInfo = PROVIDERS.find((p) => p.value === provider);

  return (
    <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto" data-testid="settings-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 dark:text-slate-100">设置</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">配置 LLM provider 和 API key</p>
      </div>

      <Card title="AI 计划推荐" description="用 LLM 生成更贴合你的训练计划,需要先配 API key">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Provider
            </label>
            <Select
              value={provider}
              onChange={(e) => setProvider(e.target.value as LlmProvider)}
              options={PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              API Key
            </label>
            <div className="flex gap-2">
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={currentProviderInfo?.placeholder ?? '输入 API key'}
                className="flex-1"
                autoComplete="off"
                data-testid="api-key-input"
              />
              <Button
                variant="secondary"
                onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? '隐藏 key' : '显示 key'}
              >
                {showKey ? '🙈' : '👁️'}
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Key 只存到你的浏览器 localStorage,不会上传到服务器(只在你点"AI 推荐"时临时转发给 LLM)。
              {currentProviderInfo && (
                <>
                  {' '}
                  <a
                    href={currentProviderInfo.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:underline"
                  >
                    获取 {currentProviderInfo.label} API key →
                  </a>
                </>
              )}
            </p>
            {apiKey && !showKey && (
              <p className="mt-1 text-xs text-slate-400" data-testid="key-mask">
                当前: {maskKey(apiKey)}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={handleSave}
              data-testid="save-settings"
              className="w-full sm:w-auto"
            >
              💾 保存
            </Button>
            <Button
              variant="secondary"
              loading={testMut.isPending}
              onClick={() => testMut.mutate()}
              disabled={!apiKey.trim() || apiKey.trim().length < 8}
              className="w-full sm:w-auto"
            >
              🔌 测试连接
            </Button>
            <Button
              variant="danger"
              onClick={handleClear}
              disabled={!apiKey}
              className="w-full sm:w-auto"
            >
              🗑 清空
            </Button>
          </div>
        </div>
      </Card>

      <Card title="数据存储" description="本应用的所有数据">
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li>· 训练计划/记录/历史:存到后端 SQLite(backend/data/gym.db)</li>
          <li>· LLM API key:存到浏览器 localStorage(只在本浏览器有效)</li>
          <li>· 不上传任何数据到第三方,除 LLM 调用外</li>
        </ul>
      </Card>

      <Card title="关于" description="Gym Tracker v0.2">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          一个完整自托管的健身房训练日志 + AI 计划推荐系统。
          技术栈:React 19 + Vite + Tailwind / Node.js + Express + SQLite / Playwright。
        </p>
      </Card>
    </div>
  );
}
