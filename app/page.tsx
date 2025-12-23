'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// =============================================================================
// 型定義
// =============================================================================

type Language = 'ja' | 'en' | 'zh-CN' | 'zh-TW' | 'ko';

interface LocalizedTagName {
  ja: string;
  en: string;
  'zh-CN': string;
  'zh-TW': string;
  ko: string;
}

interface TagData {
  category: string;
  tagName: LocalizedTagName;
  context: string;
}

interface Store {
  id: string;
  name: string;
  category: string;
  description: string;
  placeId: string;
  googleMapsUrl: string;
  selectableTags: TagData[];
}

type TagCategory = 'good' | 'normal' | 'bad';

// =============================================================================
// SVGアイコンコンポーネント
// =============================================================================

const Icons = {
  // タグセクション用アイコン
  ThumbUp: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 22V11M2 13V20C2 21.1046 2.89543 22 4 22H17.4262C18.907 22 20.1662 20.9197 20.3914 19.4562L21.4683 12.4562C21.7479 10.6389 20.3418 9 18.5032 9H14V4.46584C14 3.10399 12.896 2 11.5342 2C11.2093 2 10.915 2.1913 10.7831 2.48812L7.26394 10.4061C7.10344 10.7673 6.74532 11 6.35013 11H4C2.89543 11 2 11.8954 2 13Z" />
    </svg>
  ),
  Minus: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12H19" />
    </svg>
  ),
  ThumbDown: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 2V13M22 11V4C22 2.89543 21.1046 2 20 2H6.57376C5.09303 2 3.83381 3.08034 3.60858 4.54379L2.53176 11.5438C2.25209 13.3611 3.65821 15 5.49688 15H10V19.5342C10 20.896 11.104 22 12.4658 22C12.7907 22 13.085 21.8087 13.2169 21.5119L16.7361 13.5939C16.8966 13.2327 17.2547 13 17.6499 13H20C21.1046 13 22 12.1046 22 11Z" />
    </svg>
  ),
  User: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M5.5 21C5.5 17.134 8.41015 14 12 14C15.5899 14 18.5 17.134 18.5 21" />
    </svg>
  ),
  Sparkles: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3L13.4323 8.56775L19 10L13.4323 11.4323L12 17L10.5677 11.4323L5 10L10.5677 8.56775L12 3Z" />
      <path d="M19 15L19.7215 17.2785L22 18L19.7215 18.7215L19 21L18.2785 18.7215L16 18L18.2785 17.2785L19 15Z" />
      <path d="M5 17L5.54108 18.4589L7 19L5.54108 19.5411L5 21L4.45892 19.5411L3 19L4.45892 18.4589L5 17Z" />
    </svg>
  ),
  Copy: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" />
    </svg>
  ),
  Check: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13L9 17L19 7" />
    </svg>
  ),
  Globe: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12H22" />
      <path d="M12 2C14.5 4.5 16 8 16 12C16 16 14.5 19.5 12 22C9.5 19.5 8 16 8 12C8 8 9.5 4.5 12 2Z" />
    </svg>
  ),
  ChevronDown: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9L12 15L18 9" />
    </svg>
  ),
  Loader: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
};

// =============================================================================
// 多言語UI辞書
// =============================================================================

const UI_TEXT: Record<Language, {
  title: string;
  subtitle: string;
  goodLabel: string;
  goodDesc: string;
  normalLabel: string;
  normalDesc: string;
  badLabel: string;
  badDesc: string;
  none: string;
  noTags: string;
  profile: string;
  gender: string;
  age: string;
  visitFrequency: string;
  selectNone: string;
  male: string;
  female: string;
  other: string;
  age10s: string;
  age20s: string;
  age30s: string;
  age40s: string;
  age50s: string;
  age60plus: string;
  firstVisit: string;
  fewTimes: string;
  regular: string;
  tagsSelected: string;
  selectTags: string;
  reset: string;
  generate: string;
  generating: string;
  generatedReview: string;
  copyAndPost: string;
  copied: string;
  loading: string;
  errorNoStoreId: string;
}> = {
  ja: {
    title: 'レビュー作成',
    subtitle: 'あなたの体験をタグで選択してください',
    goodLabel: '良かった点',
    goodDesc: '満足した点を選んでください',
    normalLabel: '普通だった点',
    normalDesc: '特に印象がない点',
    badLabel: '気になった点',
    badDesc: '残念だった点があれば選んでください',
    none: '特になし',
    noTags: 'タグがありません',
    profile: 'プロフィール設定（任意）',
    gender: '性別',
    age: '年代',
    visitFrequency: '来店頻度',
    selectNone: '選択しない',
    male: '男性',
    female: '女性',
    other: 'その他',
    age10s: '10代',
    age20s: '20代',
    age30s: '30代',
    age40s: '40代',
    age50s: '50代',
    age60plus: '60代以上',
    firstVisit: '初めて',
    fewTimes: '数回',
    regular: '常連',
    tagsSelected: '個選択中',
    selectTags: 'タグを選択してください',
    reset: 'リセット',
    generate: 'レビューを生成',
    generating: '生成中...',
    generatedReview: '生成されたレビュー',
    copyAndPost: 'コピーして投稿する',
    copied: 'コピーしました',
    loading: '読み込み中...',
    errorNoStoreId: '店舗IDが指定されていません。',
  },
  en: {
    title: 'Write a Review',
    subtitle: 'Select tags that describe your experience',
    goodLabel: 'Good Points',
    goodDesc: 'What you liked',
    normalLabel: 'Neutral',
    normalDesc: 'Nothing special',
    badLabel: 'Areas for Improvement',
    badDesc: 'What could be better',
    none: 'None',
    noTags: 'No tags available',
    profile: 'Profile (Optional)',
    gender: 'Gender',
    age: 'Age',
    visitFrequency: 'Visit Frequency',
    selectNone: 'Not specified',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    age10s: 'Teens',
    age20s: '20s',
    age30s: '30s',
    age40s: '40s',
    age50s: '50s',
    age60plus: '60+',
    firstVisit: 'First time',
    fewTimes: 'A few times',
    regular: 'Regular',
    tagsSelected: 'selected',
    selectTags: 'Please select tags',
    reset: 'Reset',
    generate: 'Generate Review',
    generating: 'Generating...',
    generatedReview: 'Generated Review',
    copyAndPost: 'Copy & Post',
    copied: 'Copied',
    loading: 'Loading...',
    errorNoStoreId: 'Store ID is not specified.',
  },
  'zh-CN': {
    title: '撰写评论',
    subtitle: '请选择描述您体验的标签',
    goodLabel: '优点',
    goodDesc: '您满意的方面',
    normalLabel: '一般',
    normalDesc: '没有特别印象',
    badLabel: '待改进',
    badDesc: '令人失望的方面',
    none: '无',
    noTags: '暂无标签',
    profile: '个人资料（可选）',
    gender: '性别',
    age: '年龄',
    visitFrequency: '光顾频率',
    selectNone: '不选择',
    male: '男',
    female: '女',
    other: '其他',
    age10s: '10多岁',
    age20s: '20多岁',
    age30s: '30多岁',
    age40s: '40多岁',
    age50s: '50多岁',
    age60plus: '60岁以上',
    firstVisit: '首次',
    fewTimes: '几次',
    regular: '常客',
    tagsSelected: '个已选',
    selectTags: '请选择标签',
    reset: '重置',
    generate: '生成评论',
    generating: '生成中...',
    generatedReview: '生成的评论',
    copyAndPost: '复制并发布',
    copied: '已复制',
    loading: '加载中...',
    errorNoStoreId: '未指定店铺ID。',
  },
  'zh-TW': {
    title: '撰寫評論',
    subtitle: '請選擇描述您體驗的標籤',
    goodLabel: '優點',
    goodDesc: '您滿意的方面',
    normalLabel: '一般',
    normalDesc: '沒有特別印象',
    badLabel: '待改進',
    badDesc: '令人失望的方面',
    none: '無',
    noTags: '暫無標籤',
    profile: '個人資料（選填）',
    gender: '性別',
    age: '年齡',
    visitFrequency: '光顧頻率',
    selectNone: '不選擇',
    male: '男',
    female: '女',
    other: '其他',
    age10s: '10多歲',
    age20s: '20多歲',
    age30s: '30多歲',
    age40s: '40多歲',
    age50s: '50多歲',
    age60plus: '60歲以上',
    firstVisit: '首次',
    fewTimes: '幾次',
    regular: '常客',
    tagsSelected: '個已選',
    selectTags: '請選擇標籤',
    reset: '重設',
    generate: '生成評論',
    generating: '生成中...',
    generatedReview: '生成的評論',
    copyAndPost: '複製並發布',
    copied: '已複製',
    loading: '載入中...',
    errorNoStoreId: '未指定店鋪ID。',
  },
  ko: {
    title: '리뷰 작성',
    subtitle: '경험을 설명하는 태그를 선택하세요',
    goodLabel: '좋았던 점',
    goodDesc: '만족스러웠던 점',
    normalLabel: '보통',
    normalDesc: '특별히 인상적이지 않았던 점',
    badLabel: '개선점',
    badDesc: '아쉬웠던 점',
    none: '없음',
    noTags: '태그가 없습니다',
    profile: '프로필 (선택사항)',
    gender: '성별',
    age: '연령대',
    visitFrequency: '방문 빈도',
    selectNone: '선택 안함',
    male: '남성',
    female: '여성',
    other: '기타',
    age10s: '10대',
    age20s: '20대',
    age30s: '30대',
    age40s: '40대',
    age50s: '50대',
    age60plus: '60대 이상',
    firstVisit: '처음',
    fewTimes: '몇 번',
    regular: '단골',
    tagsSelected: '개 선택',
    selectTags: '태그를 선택하세요',
    reset: '초기화',
    generate: '리뷰 생성',
    generating: '생성 중...',
    generatedReview: '생성된 리뷰',
    copyAndPost: '복사하고 게시',
    copied: '복사됨',
    loading: '로딩 중...',
    errorNoStoreId: '매장 ID가 지정되지 않았습니다.',
  },
};

const LANGUAGE_OPTIONS: { code: Language; label: string }[] = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'EN' },
  { code: 'zh-CN', label: '简中' },
  { code: 'zh-TW', label: '繁中' },
  { code: 'ko', label: '한국' },
];

// =============================================================================
// タグ翻訳辞書
// =============================================================================

const TAG_TRANSLATIONS: Record<string, Record<Language, string>> = {
  '料理の独創性': { ja: '料理の独創性', en: 'Creative cuisine', 'zh-CN': '料理创意', 'zh-TW': '料理創意', ko: '요리 창의성' },
  'サービス・ホスピタリティ': { ja: 'サービス・ホスピタリティ', en: 'Service', 'zh-CN': '服务', 'zh-TW': '服務', ko: '서비스' },
  'ワイン・ペアリング': { ja: 'ワイン・ペアリング', en: 'Wine pairing', 'zh-CN': '葡萄酒搭配', 'zh-TW': '葡萄酒搭配', ko: '와인 페어링' },
  '店の雰囲気・内装': { ja: '店の雰囲気・内装', en: 'Atmosphere', 'zh-CN': '氛围', 'zh-TW': '氛圍', ko: '분위기' },
  '提供タイミング': { ja: '提供タイミング', en: 'Serving timing', 'zh-CN': '上菜时间', 'zh-TW': '上菜時間', ko: '서빙 타이밍' },
  '料理の質': { ja: '料理の質', en: 'Food quality', 'zh-CN': '料理品质', 'zh-TW': '料理品質', ko: '요리 품질' },
  '接客態度': { ja: '接客態度', en: 'Service attitude', 'zh-CN': '服务态度', 'zh-TW': '服務態度', ko: '접객 태도' },
  'メニューの豊富さ': { ja: 'メニューの豊富さ', en: 'Menu variety', 'zh-CN': '菜单丰富', 'zh-TW': '菜單豐富', ko: '메뉴 다양성' },
  'コスパ': { ja: 'コスパ', en: 'Value', 'zh-CN': '性价比', 'zh-TW': '性價比', ko: '가성비' },
  '雰囲気': { ja: '雰囲気', en: 'Atmosphere', 'zh-CN': '氛围', 'zh-TW': '氛圍', ko: '분위기' },
  '清潔感': { ja: '清潔感', en: 'Cleanliness', 'zh-CN': '清洁度', 'zh-TW': '清潔度', ko: '청결함' },
  'ドリンクの種類': { ja: 'ドリンクの種類', en: 'Drinks', 'zh-CN': '饮料', 'zh-TW': '飲料', ko: '음료' },
  '席の快適さ': { ja: '席の快適さ', en: 'Seat comfort', 'zh-CN': '座位舒适', 'zh-TW': '座位舒適', ko: '좌석' },
  '待ち時間': { ja: '待ち時間', en: 'Wait time', 'zh-CN': '等待时间', 'zh-TW': '等待時間', ko: '대기 시간' },
  '予約対応': { ja: '予約対応', en: 'Reservation', 'zh-CN': '预约', 'zh-TW': '預約', ko: '예약' },
};

function getTranslatedTagName(jaTagName: string, language: Language): string {
  const translations = TAG_TRANSLATIONS[jaTagName];
  if (translations && translations[language]) {
    return translations[language];
  }
  return jaTagName;
}

// =============================================================================
// タグセクションコンポーネント
// =============================================================================

function TagSection({
  title,
  description,
  icon,
  colorScheme,
  tags,
  selectedTags,
  isNoneSelected,
  onToggle,
  onNoneToggle,
  disabledTags,
  language,
  noneText,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  colorScheme: 'success' | 'neutral' | 'warning';
  tags: TagData[];
  selectedTags: string[];
  isNoneSelected: boolean;
  onToggle: (tagName: string) => void;
  onNoneToggle: () => void;
  disabledTags: string[];
  language: Language;
  noneText: string;
}) {
  const colorConfig = {
    success: {
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      selected: 'bg-emerald-600',
    },
    neutral: {
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-500',
      selected: 'bg-gray-500',
    },
    warning: {
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      selected: 'bg-amber-600',
    },
  };

  const colors = colorConfig[colorScheme];

  const getTagLabel = (tag: TagData): string => {
    const jaName = tag.tagName.ja;
    const translated = getTranslatedTagName(jaName, language);
    if (translated !== jaName || language === 'ja') {
      return translated;
    }
    return tag.tagName[language] || tag.tagName.ja;
  };

  const getTagKey = (tag: TagData): string => tag.tagName.ja;

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl ${colors.iconBg} ${colors.iconColor} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {/* None Button */}
        <button
          onClick={onNoneToggle}
          className={`
            tag-button
            ${isNoneSelected
              ? `${colors.selected} text-white selected`
              : `bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100`
            }
          `}
        >
          {noneText}
        </button>

        {/* Tag Buttons */}
        {tags.map((tag) => {
          const tagKey = getTagKey(tag);
          const isSelected = selectedTags.includes(tagKey);
          const isDisabled = disabledTags.includes(tagKey) || isNoneSelected;

          return (
            <button
              key={tagKey}
              onClick={() => !isDisabled && onToggle(tagKey)}
              disabled={isDisabled}
              className={`
                tag-button
                ${isSelected
                  ? `${colors.selected} text-white selected`
                  : `bg-gray-50 text-gray-700 border-gray-200`
                }
              `}
              title={tag.context}
            >
              {getTagLabel(tag)}
            </button>
          );
        })}
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

  // 言語状態
  const [language, setLanguage] = useState<Language>('ja');
  const t = UI_TEXT[language];

  // タグ選択状態
  const [goodTags, setGoodTags] = useState<string[]>([]);
  const [normalTags, setNormalTags] = useState<string[]>([]);
  const [badTags, setBadTags] = useState<string[]>([]);

  // 「特になし」選択状態
  const [goodNone, setGoodNone] = useState(false);
  const [normalNone, setNormalNone] = useState(true);
  const [badNone, setBadNone] = useState(true);

  // プロフィール
  const [userGender, setUserGender] = useState<string>('');
  const [userAge, setUserAge] = useState<string>('');
  const [visitFrequency, setVisitFrequency] = useState<string>('');

  // 生成状態
  const [generatedReview, setGeneratedReview] = useState('');
  const [generating, setGenerating] = useState(false);

  // コピー状態
  const [copied, setCopied] = useState(false);

  // 店舗データの取得
  useEffect(() => {
    async function loadStore() {
      if (!storeId) {
        setError('店舗IDが指定されていません。URLに ?id=店舗ID を追加してください。');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/store?id=${encodeURIComponent(storeId)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '店舗データの取得に失敗しました');
        }

        setStore(data.store);
      } catch (err) {
        setError(err instanceof Error ? err.message : '店舗データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }

    loadStore();
  }, [storeId]);

  // タグのトグル処理
  const toggleTag = (category: TagCategory, tagName: string) => {
    const setters = { good: setGoodTags, normal: setNormalTags, bad: setBadTags };
    const noneSetters = { good: setGoodNone, normal: setNormalNone, bad: setBadNone };
    const current = { good: goodTags, normal: normalTags, bad: badTags }[category];

    if (!current.includes(tagName)) {
      noneSetters[category](false);
      setters[category]([...current, tagName]);
    } else {
      setters[category](current.filter((t) => t !== tagName));
    }
  };

  // 「特になし」のトグル処理
  const toggleNone = (category: TagCategory) => {
    const noneStates = { good: goodNone, normal: normalNone, bad: badNone };
    const noneSetters = { good: setGoodNone, normal: setNormalNone, bad: setBadNone };
    const tagSetters = { good: setGoodTags, normal: setNormalTags, bad: setBadTags };

    const currentNone = noneStates[category];

    if (!currentNone) {
      noneSetters[category](true);
      tagSetters[category]([]);
    } else {
      noneSetters[category](false);
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

    const sendGoodTags = goodNone ? [] : goodTags;
    const sendNormalTags = normalNone ? [] : normalTags;
    const sendBadTags = badNone ? [] : badTags;

    const totalTags = sendGoodTags.length + sendNormalTags.length + sendBadTags.length;
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
          storeId: store.id,
          storeName: store.name,
          storeCategory: store.category,
          goodTags: sendGoodTags,
          normalTags: sendNormalTags,
          badTags: sendBadTags,
          userGender: userGender || undefined,
          userAge: userAge || undefined,
          visitFrequency: visitFrequency || undefined,
          language: language,
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Google Mapsへ遷移
      if (store?.googleMapsUrl) {
        window.open(store.googleMapsUrl, '_blank');
      } else {
        const query = encodeURIComponent(store?.name || '');
        window.open(`https://www.google.com/maps/search/${query}`, '_blank');
      }
    } catch {
      alert('コピーに失敗しました');
    }
  };

  // 選択をリセット
  const resetSelection = () => {
    setGoodTags([]);
    setNormalTags([]);
    setBadTags([]);
    setGoodNone(false);
    setNormalNone(true);
    setBadNone(true);
    setGeneratedReview('');
    setError(null);
  };

  // ローディング表示
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Icons.Loader className="w-8 h-8 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">{t.loading}</p>
        </div>
      </div>
    );
  }

  // エラー表示
  if (error && !store) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card p-6 text-center max-w-sm">
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const effectiveGoodCount = goodNone ? 0 : goodTags.length;
  const effectiveNormalCount = normalNone ? 0 : normalTags.length;
  const effectiveBadCount = badNone ? 0 : badTags.length;
  const totalSelected = effectiveGoodCount + effectiveNormalCount + effectiveBadCount;

  return (
    <div className="min-h-screen pb-32">
      {/* 言語切替ヘッダー (Sticky) */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <Icons.Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => setLanguage(opt.code)}
                  className={`lang-pill ${language === opt.code ? 'active' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* 店舗名ヘッダー */}
        <div className="text-center py-4">
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            {store?.name || t.title}
          </h1>
          <p className="text-sm text-gray-500">{t.subtitle}</p>
        </div>

        {/* タグ選択エリア */}
        <TagSection
          title={t.goodLabel}
          description={t.goodDesc}
          icon={<Icons.ThumbUp className="w-5 h-5" />}
          colorScheme="success"
          tags={store?.selectableTags || []}
          selectedTags={goodTags}
          isNoneSelected={goodNone}
          onToggle={(tag) => toggleTag('good', tag)}
          onNoneToggle={() => toggleNone('good')}
          disabledTags={getDisabledTags('good')}
          language={language}
          noneText={t.none}
        />

        <TagSection
          title={t.normalLabel}
          description={t.normalDesc}
          icon={<Icons.Minus className="w-5 h-5" />}
          colorScheme="neutral"
          tags={store?.selectableTags || []}
          selectedTags={normalTags}
          isNoneSelected={normalNone}
          onToggle={(tag) => toggleTag('normal', tag)}
          onNoneToggle={() => toggleNone('normal')}
          disabledTags={getDisabledTags('normal')}
          language={language}
          noneText={t.none}
        />

        <TagSection
          title={t.badLabel}
          description={t.badDesc}
          icon={<Icons.ThumbDown className="w-5 h-5" />}
          colorScheme="warning"
          tags={store?.selectableTags || []}
          selectedTags={badTags}
          isNoneSelected={badNone}
          onToggle={(tag) => toggleTag('bad', tag)}
          onNoneToggle={() => toggleNone('bad')}
          disabledTags={getDisabledTags('bad')}
          language={language}
          noneText={t.none}
        />

        {/* プロフィール設定（折りたたみ） */}
        <details className="card overflow-hidden group">
          <summary className="px-5 py-4 cursor-pointer font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 list-none">
            <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center">
              <Icons.User className="w-5 h-5" />
            </div>
            <span className="flex-1">{t.profile}</span>
            <Icons.ChevronDown className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-5 pt-2 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t.gender}</label>
              <select
                value={userGender}
                onChange={(e) => setUserGender(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
              >
                <option value="">{t.selectNone}</option>
                <option value="男性">{t.male}</option>
                <option value="女性">{t.female}</option>
                <option value="その他">{t.other}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t.age}</label>
              <select
                value={userAge}
                onChange={(e) => setUserAge(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
              >
                <option value="">{t.selectNone}</option>
                <option value="10代">{t.age10s}</option>
                <option value="20代">{t.age20s}</option>
                <option value="30代">{t.age30s}</option>
                <option value="40代">{t.age40s}</option>
                <option value="50代">{t.age50s}</option>
                <option value="60代以上">{t.age60plus}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t.visitFrequency}</label>
              <select
                value={visitFrequency}
                onChange={(e) => setVisitFrequency(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
              >
                <option value="">{t.selectNone}</option>
                <option value="初めて">{t.firstVisit}</option>
                <option value="数回">{t.fewTimes}</option>
                <option value="常連">{t.regular}</option>
              </select>
            </div>
          </div>
        </details>

        {/* エラー表示 */}
        {error && (
          <div className="card p-4 border-red-200 bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* 生成結果 */}
        {generatedReview && (
          <div className="result-card animate-fade-in">
            <h2 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <Icons.Sparkles className="w-4 h-4" />
              {t.generatedReview}
            </h2>
            <div className="text-gray-800 leading-relaxed mb-5 text-base">
              {generatedReview}
            </div>
            <button
              onClick={copyToClipboard}
              className="btn-copy flex items-center justify-center gap-2"
            >
              {copied ? <Icons.Check className="w-5 h-5" /> : <Icons.Copy className="w-5 h-5" />}
              <span>{copied ? t.copied : t.copyAndPost}</span>
            </button>
          </div>
        )}
      </main>

      {/* 固定フッター */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <div className="max-w-md mx-auto">
          {/* 選択状況 */}
          <div className="flex items-center justify-between mb-3 text-sm">
            <div className="text-gray-600">
              {totalSelected > 0 ? (
                <span>
                  <span className="font-semibold text-gray-900">{totalSelected}</span>
                  {' '}{t.tagsSelected}
                </span>
              ) : (
                <span className="text-gray-400">{t.selectTags}</span>
              )}
            </div>
            {totalSelected > 0 && (
              <button
                onClick={resetSelection}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                {t.reset}
              </button>
            )}
          </div>

          {/* 生成ボタン */}
          <button
            onClick={generateReview}
            disabled={generating || totalSelected === 0}
            className="btn-generate flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Icons.Loader className="w-5 h-5" />
                <span>{t.generating}</span>
              </>
            ) : (
              <>
                <Icons.Sparkles className="w-5 h-5" />
                <span>{t.generate}</span>
              </>
            )}
          </button>
        </div>
      </footer>

      {/* トースト通知 */}
      {copied && (
        <div className="toast animate-fade-in flex items-center gap-2">
          <Icons.Check className="w-4 h-4" />
          {t.copied}
        </div>
      )}
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
        <div className="flex min-h-screen items-center justify-center">
          <Icons.Loader className="w-8 h-8 text-gray-400" />
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
