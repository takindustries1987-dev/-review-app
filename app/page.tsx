'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// =============================================================================
// 型定義
// =============================================================================

interface TagData {
  category: string;
  tagName: string;
  context: string;
}

interface Store {
  id: string;
  name: string;
  category: string;
  description: string;
  googleMapsUrl: string;
  selectableTags: TagData[];
}

type TagCategory = 'good' | 'normal' | 'bad';

// =============================================================================
// タグ選択コンポーネント
// =============================================================================

function TagSelector({
  label,
  description,
  color,
  tags,
  selectedTags,
  onToggle,
  disabledTags,
}: {
  label: string;
  description: string;
  color: 'green' | 'gray' | 'red';
  tags: TagData[];
  selectedTags: string[];
  onToggle: (tagName: string) => void;
  disabledTags: string[];
}) {
  const colorClasses = {
    green: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      header: 'bg-emerald-100 text-emerald-800',
      selected: 'bg-emerald-500 text-white border-emerald-500',
      unselected: 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50',
    },
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      header: 'bg-gray-100 text-gray-700',
      selected: 'bg-gray-500 text-white border-gray-500',
      unselected: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100',
    },
    red: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      header: 'bg-rose-100 text-rose-800',
      selected: 'bg-rose-500 text-white border-rose-500',
      unselected: 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50',
    },
  };

  const classes = colorClasses[color];

  return (
    <div className={`rounded-2xl border ${classes.border} ${classes.bg} overflow-hidden`}>
      <div className={`px-4 py-3 ${classes.header}`}>
        <h3 className="font-bold text-lg">{label}</h3>
        <p className="text-sm opacity-80">{description}</p>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const isSelected = selectedTags.includes(tag.tagName);
            const isDisabled = disabledTags.includes(tag.tagName);

            return (
              <button
                key={tag.tagName}
                onClick={() => !isDisabled && onToggle(tag.tagName)}
                disabled={isDisabled}
                className={`
                  px-4 py-2 rounded-full border text-sm font-medium transition-all
                  ${isSelected ? classes.selected : classes.unselected}
                  ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                `}
                title={tag.context}
              >
                {tag.tagName}
              </button>
            );
          })}
        </div>
        {tags.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">
            タグがありません
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// メインコンテンツ
// =============================================================================

function ReviewContent() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get('id');

  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // タグ選択状態
  const [goodTags, setGoodTags] = useState<string[]>([]);
  const [normalTags, setNormalTags] = useState<string[]>([]);
  const [badTags, setBadTags] = useState<string[]>([]);

  // プロフィール
  const [userGender, setUserGender] = useState<string>('');
  const [userAge, setUserAge] = useState<string>('');
  const [visitFrequency, setVisitFrequency] = useState<string>('');

  // 生成状態
  const [generatedReview, setGeneratedReview] = useState('');
  const [generating, setGenerating] = useState(false);

  // 店舗データの取得
  useEffect(() => {
    async function loadStore() {
      if (!storeId) {
        setError('店舗IDが指定されていません。URLに ?id=店舗ID を追加してください。');
        setLoading(false);
        return;
      }

      try {
        // TODO: 実際の実装ではAPIから取得
        // デモ用にモックデータを使用
        const mockStore: Store = {
          id: storeId,
          name: 'サンプル店舗',
          category: '飲食',
          description: 'これはサンプルの店舗です',
          googleMapsUrl: 'https://maps.google.com',
          selectableTags: [
            { category: '飲食', tagName: '料理の味', context: '提供される料理の味' },
            { category: '飲食', tagName: '接客対応', context: 'スタッフの接客態度' },
            { category: '飲食', tagName: '店内の雰囲気', context: '店舗の雰囲気・内装' },
            { category: '飲食', tagName: 'コスパ', context: '価格に対する満足度' },
            { category: '飲食', tagName: '清潔感', context: '店内の清潔さ' },
            { category: '飲食', tagName: '待ち時間', context: '待ち時間の長さ' },
            { category: '飲食', tagName: 'メニューの豊富さ', context: 'メニューの種類' },
            { category: '飲食', tagName: '駐車場', context: '駐車場の有無・広さ' },
          ],
        };

        setStore(mockStore);
      } catch {
        setError('店舗データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }

    loadStore();
  }, [storeId]);

  // タグのトグル処理
  const toggleTag = (category: TagCategory, tagName: string) => {
    const setters = {
      good: setGoodTags,
      normal: setNormalTags,
      bad: setBadTags,
    };
    const current = { good: goodTags, normal: normalTags, bad: badTags }[category];

    if (current.includes(tagName)) {
      setters[category](current.filter((t) => t !== tagName));
    } else {
      setters[category]([...current, tagName]);
    }
  };

  // 他のカテゴリで選択済みのタグ
  const getDisabledTags = (currentCategory: TagCategory): string[] => {
    const allSelected = { good: goodTags, normal: normalTags, bad: badTags };
    return Object.entries(allSelected)
      .filter(([cat]) => cat !== currentCategory)
      .flatMap(([, tags]) => tags);
  };

  // レビュー生成
  const generateReview = async () => {
    if (!store) return;

    const totalTags = goodTags.length + normalTags.length + badTags.length;
    if (totalTags === 0) {
      setError('少なくとも1つのタグを選択してください');
      return;
    }

    setGenerating(true);
    setGeneratedReview('');
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: store.name,
          storeCategory: store.category,
          goodTags,
          normalTags,
          badTags,
          userGender: userGender || undefined,
          userAge: userAge || undefined,
          visitFrequency: visitFrequency || undefined,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedReview(data.review);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'レビューの生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  // クリップボードにコピー
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedReview);
      alert('レビューをコピーしました！');
    } catch {
      alert('コピーに失敗しました');
    }
  };

  // 選択をリセット
  const resetSelection = () => {
    setGoodTags([]);
    setNormalTags([]);
    setBadTags([]);
    setGeneratedReview('');
    setError(null);
  };

  // ローディング表示
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-xl text-gray-500">読み込み中...</div>
      </div>
    );
  }

  // エラー表示
  if (error && !store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const totalSelected = goodTags.length + normalTags.length + badTags.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">
            {store?.name || 'レビュー作成'}
          </h1>
          <p className="text-sm text-gray-500">
            あなたの体験をタグで選択してください
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* 説明 */}
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">📝 正直なレビューを作成</p>
          <p>各カテゴリから当てはまるものを選んでください。選択した内容のみがレビューに反映されます。</p>
        </div>

        {/* タグ選択エリア */}
        <div className="space-y-4">
          <TagSelector
            label="😊 良かった点"
            description="特に満足したポイントを選択"
            color="green"
            tags={store?.selectableTags || []}
            selectedTags={goodTags}
            onToggle={(tag) => toggleTag('good', tag)}
            disabledTags={getDisabledTags('good')}
          />

          <TagSelector
            label="😐 普通・気にならなかった点"
            description="特に良くも悪くもなかったポイント"
            color="gray"
            tags={store?.selectableTags || []}
            selectedTags={normalTags}
            onToggle={(tag) => toggleTag('normal', tag)}
            disabledTags={getDisabledTags('normal')}
          />

          <TagSelector
            label="😔 イマイチ・改善点"
            description="不満や改善してほしいポイント"
            color="red"
            tags={store?.selectableTags || []}
            selectedTags={badTags}
            onToggle={(tag) => toggleTag('bad', tag)}
            disabledTags={getDisabledTags('bad')}
          />
        </div>

        {/* プロフィール（任意） */}
        <details className="rounded-xl bg-white border border-gray-200 overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer font-medium text-gray-700 hover:bg-gray-50">
            👤 プロフィール設定（任意）
          </summary>
          <div className="px-4 pb-4 pt-2 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">性別</label>
              <select
                value={userGender}
                onChange={(e) => setUserGender(e.target.value)}
                className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">選択しない</option>
                <option value="男性">男性</option>
                <option value="女性">女性</option>
                <option value="その他">その他</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">年代</label>
              <select
                value={userAge}
                onChange={(e) => setUserAge(e.target.value)}
                className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">選択しない</option>
                <option value="10代">10代</option>
                <option value="20代">20代</option>
                <option value="30代">30代</option>
                <option value="40代">40代</option>
                <option value="50代">50代</option>
                <option value="60代以上">60代以上</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">来店頻度</label>
              <select
                value={visitFrequency}
                onChange={(e) => setVisitFrequency(e.target.value)}
                className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">選択しない</option>
                <option value="初めて">初めて</option>
                <option value="数回">数回</option>
                <option value="常連">常連</option>
              </select>
            </div>
          </div>
        </details>

        {/* 選択状況サマリー */}
        {totalSelected > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-white border border-gray-200 px-4 py-3">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{totalSelected}</span> 個のタグを選択中
              {goodTags.length > 0 && <span className="ml-2 text-emerald-600">😊{goodTags.length}</span>}
              {normalTags.length > 0 && <span className="ml-2 text-gray-500">😐{normalTags.length}</span>}
              {badTags.length > 0 && <span className="ml-2 text-rose-600">😔{badTags.length}</span>}
            </div>
            <button
              onClick={resetSelection}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              リセット
            </button>
          </div>
        )}

        {/* 生成ボタン */}
        <button
          onClick={generateReview}
          disabled={generating || totalSelected === 0}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 text-lg font-bold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? '生成中...' : 'レビューを生成する'}
        </button>

        {/* エラー表示 */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* 生成結果 */}
        {generatedReview && (
          <section className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-bold text-gray-900">
              ✍️ 生成されたレビュー
            </h2>
            <div className="mb-4 rounded-lg bg-gray-50 p-4 text-gray-800 leading-relaxed">
              {generatedReview}
            </div>
            <div className="flex gap-3">
              <button
                onClick={copyToClipboard}
                className="flex-1 rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700"
              >
                📋 コピーする
              </button>
              {store?.googleMapsUrl && (
                <a
                  href={store.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-lg border border-blue-600 py-3 text-center font-medium text-blue-600 transition-colors hover:bg-blue-50"
                >
                  📍 Googleマップで投稿
                </a>
              )}
            </div>
          </section>
        )}
      </main>

      {/* フッター */}
      <footer className="mt-8 border-t bg-gray-50 py-6">
        <p className="text-center text-sm text-gray-400">
          選択したタグのみを参考にレビューを生成しています
        </p>
      </footer>
    </div>
  );
}

// =============================================================================
// メインページ
// =============================================================================

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="text-xl text-gray-500">読み込み中...</div>
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
