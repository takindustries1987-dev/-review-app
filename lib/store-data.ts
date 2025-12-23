/**
 * Googleスプレッドシートからの店舗データとカテゴリタグデータの取得
 * 
 * このファイルは以下の機能を提供します：
 * - Storesシートからの店舗データ取得
 * - CategoryTagsシートからのタグデータ取得
 * - 店舗データとタグデータの結合（マッピング）
 */

import Papa from 'papaparse';

// =============================================================================
// 型定義
// =============================================================================

/**
 * タグ名の多言語ラベル（5言語対応）
 */
export interface LocalizedTagName {
  ja: string;
  en: string;
  'zh-CN': string;
  'zh-TW': string;
  ko: string;
}

/**
 * カテゴリタグのデータ構造
 * CategoryTagsシートの各行に対応
 */
export interface TagData {
  /** カテゴリ名（例: 飲食店、美容院） */
  category: string;
  /** タグ名（多言語対応） */
  tagName: LocalizedTagName;
  /** タグのコンテキスト・説明 */
  context: string;
}

/**
 * 店舗データの構造
 * Storesシートの各行に対応
 */
export interface Store {
  /** 店舗ID（URLパラメータで使用） */
  id: string;
  /** 店舗名 */
  name: string;
  /** 店舗のカテゴリ */
  category: string;
  /** 店舗の説明文 */
  description: string;
  /** Google マップのPlace ID */
  placeId: string;
  /** Google マップのレビューURL */
  googleMapsUrl: string;
  /** この店舗で選択可能なタグ一覧 */
  selectableTags: TagData[];
}

/**
 * CSVから取得した生の店舗データ
 * 列名はスプレッドシートのヘッダーに合わせる
 */
interface RawStoreData {
  '店舗ID': string;
  '店名・会社名': string;
  '業態': string;
  'Place ID'?: string;
}

/**
 * CSVから取得した生のタグデータ
 */
interface RawTagData {
  Category: string;
  TagName: string;
  TagName_en?: string;
  TagName_zh_cn?: string;
  TagName_zh_tw?: string;
  TagName_ko?: string;
  Context: string;
}

// =============================================================================
// 設定
// =============================================================================

/**
 * GoogleスプレッドシートのCSV URLを取得
 * Cloudflare Workersでは環境変数がランタイムで利用可能なため、関数で取得
 * @returns CSV取得用のURL
 */
export function getSheetUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SHEET_URL?.trim();
  return envUrl ||
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vSnffrfQMVoVjzQ0sLQjNDfiL1RdgUW2XmYoxcdl7amDUZnRnG87bLTkWu0DCpsO-_u2E6Y2j9xV3m7/pub?output=csv';
}

/**
 * カテゴリタグシートのGID
 * CategoryTagsシートのGIDが別途必要な場合に使用
 */
const CATEGORY_TAGS_SHEET_GID = process.env.NEXT_PUBLIC_CATEGORY_TAGS_SHEET_GID || '';

// =============================================================================
// ヘルパー関数
// =============================================================================

/**
 * シートURLから別のGIDのURLを生成
 * @param baseUrl 元のCSV URL
 * @param newGid 新しいGID
 * @returns 新しいGIDのCSV URL
 */
function getSheetUrlWithGid(baseUrl: string, newGid: string): string {
  // gid=XXXの部分を置換
  return baseUrl.replace(/gid=\d+/, `gid=${newGid}`);
}


/**
 * CSVデータをパースしてオブジェクト配列に変換
 * @param csvText CSV形式のテキスト
 * @returns パースされたデータ配列
 */
function parseCsv<T>(csvText: string): T[] {
  const result = Papa.parse<T>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    console.warn('CSVパースエラー:', result.errors);
  }

  return result.data;
}

// =============================================================================
// データ取得関数
// =============================================================================

/**
 * CategoryTagsシートからタグデータを取得
 * @returns タグデータの配列
 */
export async function fetchCategoryTags(): Promise<TagData[]> {
  const sheetUrl = getSheetUrl();
  if (!sheetUrl || !CATEGORY_TAGS_SHEET_GID) {
    console.warn('シートURLまたはカテゴリタグシートGIDが設定されていません');
    return [];
  }

  try {
    const url = getSheetUrlWithGid(sheetUrl, CATEGORY_TAGS_SHEET_GID);
    const response = await fetch(url, { redirect: 'follow' });

    if (!response.ok) {
      throw new Error(`カテゴリタグの取得に失敗: ${response.status}`);
    }

    const csvText = await response.text();
    const rawData = parseCsv<RawTagData>(csvText);

    // データを TagData 形式に変換（5言語対応）
    const tags: TagData[] = rawData.map((row) => {
      const jaName = row.TagName?.trim() || '';
      return {
        category: row.Category?.trim() || '',
        tagName: {
          ja: jaName,
          en: row.TagName_en?.trim() || jaName,
          'zh-CN': row.TagName_zh_cn?.trim() || jaName,
          'zh-TW': row.TagName_zh_tw?.trim() || jaName,
          ko: row.TagName_ko?.trim() || jaName,
        },
        context: row.Context?.trim() || '',
      };
    });

    return tags.filter((tag) => tag.category && tag.tagName.ja);
  } catch (error) {
    console.error('カテゴリタグの取得エラー:', error);
    return [];
  }
}

/**
 * Storesシートから店舗データを取得し、カテゴリに対応するタグを結合
 * @returns 選択可能なタグを含む店舗データの配列
 */
export async function fetchStores(): Promise<Store[]> {
  // ハードコードURLで確実に動作させる
  const HARDCODED_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSnffrfQMVoVjzQ0sLQjNDfiL1RdgUW2XmYoxcdl7amDUZnRnG87bLTkWu0DCpsO-_u2E6Y2j9xV3m7/pub?output=csv';
  const TAGS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSnffrfQMVoVjzQ0sLQjNDfiL1RdgUW2XmYoxcdl7amDUZnRnG87bLTkWu0DCpsO-_u2E6Y2j9xV3m7/pub?gid=1709518251&single=true&output=csv';

  try {
    // 店舗データを取得
    const storesResponse = await fetch(HARDCODED_URL, { redirect: 'follow' });
    if (!storesResponse.ok) {
      throw new Error(`店舗データの取得に失敗: ${storesResponse.status}`);
    }
    const csvText = await storesResponse.text();
    const rawStores = parseCsv<RawStoreData>(csvText);

    // タグデータを取得
    let allTags: TagData[] = [];
    try {
      const tagsResponse = await fetch(TAGS_URL, { redirect: 'follow' });
      if (tagsResponse.ok) {
        const tagsCsv = await tagsResponse.text();
        const rawTags = parseCsv<RawTagData>(tagsCsv);
        allTags = rawTags
          .map((row) => {
            const jaName = row.TagName?.trim() || '';
            return {
              category: row.Category?.trim() || '',
              tagName: {
                ja: jaName,
                en: row.TagName_en?.trim() || jaName,
                'zh-CN': row.TagName_zh_cn?.trim() || jaName,
                'zh-TW': row.TagName_zh_tw?.trim() || jaName,
                ko: row.TagName_ko?.trim() || jaName,
              },
              context: row.Context?.trim() || '',
            };
          })
          .filter((tag) => tag.category && tag.tagName.ja);
      }
    } catch (e) {
      console.warn('タグ取得エラー:', e);
    }

    // カテゴリごとにタグをグループ化
    const tagsByCategory = new Map<string, TagData[]>();
    for (const tag of allTags) {
      const existing = tagsByCategory.get(tag.category) || [];
      existing.push(tag);
      tagsByCategory.set(tag.category, existing);
    }

    // 店舗データにタグを結合
    const stores: Store[] = rawStores
      .filter((row) => row['店舗ID'] && row['店名・会社名'])
      .map((row) => {
        const category = row['業態']?.trim() || '';
        const selectableTags = tagsByCategory.get(category) || [];
        const placeId = row['Place ID']?.trim() || '';

        return {
          id: row['店舗ID'].trim(),
          name: row['店名・会社名'].trim(),
          category,
          description: '',
          placeId,
          googleMapsUrl: placeId ? `https://search.google.com/local/writereview?placeid=${placeId}` : '',
          selectableTags,
        };
      });

    return stores;
  } catch (error) {
    console.error('店舗データの取得エラー:', error);
    return [];
  }
}

/**
 * 店舗IDから特定の店舗を取得
 * @param storeId 店舗ID
 * @returns 店舗データ（見つからない場合はnull）
 */
export async function fetchStoreById(storeId: string): Promise<Store | null> {
  const stores = await fetchStores();
  return stores.find((store) => store.id === storeId) || null;
}

/**
 * 特定のカテゴリのタグ一覧を取得
 * @param category カテゴリ名
 * @returns そのカテゴリに属するタグの配列
 */
export async function fetchTagsByCategory(category: string): Promise<TagData[]> {
  const allTags = await fetchCategoryTags();
  return allTags.filter((tag) => tag.category === category);
}

// =============================================================================
// 利用ログ記録（Google Apps Script Webhook）
// =============================================================================

/**
 * 日本時間 (JST) の読みやすいタイムスタンプを生成
 * @returns YYYY/MM/DD HH:mm:ss 形式の文字列
 */
function getJSTTimestamp(): string {
  const now = new Date();
  const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));

  const year = jst.getFullYear();
  const month = String(jst.getMonth() + 1).padStart(2, '0');
  const day = String(jst.getDate()).padStart(2, '0');
  const hours = String(jst.getHours()).padStart(2, '0');
  const minutes = String(jst.getMinutes()).padStart(2, '0');
  const seconds = String(jst.getSeconds()).padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * UsageLogsシートにログを記録
 * Google Apps Script のWebアプリにPOSTリクエストを送信して記録
 * 
 * @param storeName 店舗名（または店舗ID）
 * @param language 言語コード (ja, en, zh-CN, zh-TW, ko)
 * @param tokenCount 推定トークン数（文字数ベース）
 */
export async function logUsage(
  storeName: string,
  language: string,
  tokenCount: number
): Promise<void> {
  const webhookUrl = process.env.USAGE_LOG_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('USAGE_LOG_WEBHOOK_URL is not configured, skipping usage log');
    return;
  }

  try {
    // 日本時間のタイムスタンプ (YYYY/MM/DD HH:mm:ss)
    const timestamp = getJSTTimestamp();

    // 概算コスト計算 (1トークン=0.0003円、小数点以下第2位まで)
    const cost = Math.round(tokenCount * 0.0003 * 100) / 100;

    // GAS側のカラム順序に合わせる: timestamp, storeName, language, cost, tokenCount
    const payload = {
      timestamp,
      storeName,
      language,
      cost,
      tokenCount,
    };

    console.log('Sending usage log:', payload);

    // GASのWebhookはリダイレクトを返すため、redirect: 'follow'を設定
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain', // GASはtext/plainの方が確実に動作する
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    console.log('Usage log response status:', response.status);
  } catch (error) {
    // ログ記録の失敗はアプリケーションの動作に影響させない
    console.error('Failed to log usage:', error);
  }
}
