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
 * カテゴリタグのデータ構造
 * CategoryTagsシートの各行に対応
 */
export interface TagData {
  /** カテゴリ名（例: 飲食店、美容院） */
  category: string;
  /** タグ名（例: 料理の味、接客対応） */
  tagName: string;
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
  /** Google マップのレビューURL */
  googleMapsUrl: string;
  /** この店舗で選択可能なタグ一覧 */
  selectableTags: TagData[];
}

/**
 * CSVから取得した生の店舗データ
 */
interface RawStoreData {
  id: string;
  name: string;
  category: string;
  description: string;
  googleMapsUrl: string;
}

/**
 * CSVから取得した生のタグデータ
 */
interface RawTagData {
  Category: string;
  TagName: string;
  Context: string;
}

// =============================================================================
// 設定
// =============================================================================

/**
 * GoogleスプレッドシートのID
 * スプレッドシートのURLから取得: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
 */
const SPREADSHEET_ID = process.env.NEXT_PUBLIC_SPREADSHEET_ID || '';

/**
 * 各シートのGID（シート固有のID）
 * シートを開いた時のURL末尾の #gid=XXXX から取得
 */
const STORES_SHEET_GID = process.env.NEXT_PUBLIC_STORES_SHEET_GID || '0';
const CATEGORY_TAGS_SHEET_GID = process.env.NEXT_PUBLIC_CATEGORY_TAGS_SHEET_GID || '';

// =============================================================================
// ヘルパー関数
// =============================================================================

/**
 * GoogleスプレッドシートをCSV形式で取得するためのURLを生成
 * @param sheetGid シートのGID
 * @returns CSV取得用のURL
 */
function getSheetCsvUrl(sheetGid: string): string {
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${sheetGid}`;
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
  if (!SPREADSHEET_ID || !CATEGORY_TAGS_SHEET_GID) {
    console.warn('スプレッドシートIDまたはカテゴリタグシートGIDが設定されていません');
    return [];
  }

  try {
    const url = getSheetCsvUrl(CATEGORY_TAGS_SHEET_GID);
    const response = await fetch(url, { 
      next: { revalidate: 300 } // 5分間キャッシュ
    });

    if (!response.ok) {
      throw new Error(`カテゴリタグの取得に失敗: ${response.status}`);
    }

    const csvText = await response.text();
    const rawData = parseCsv<RawTagData>(csvText);

    // データを TagData 形式に変換
    const tags: TagData[] = rawData.map((row) => ({
      category: row.Category?.trim() || '',
      tagName: row.TagName?.trim() || '',
      context: row.Context?.trim() || '',
    }));

    return tags.filter((tag) => tag.category && tag.tagName);
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
  if (!SPREADSHEET_ID) {
    console.warn('スプレッドシートIDが設定されていません');
    return [];
  }

  try {
    // 店舗データとタグデータを並行して取得
    const [storesResponse, allTags] = await Promise.all([
      fetch(getSheetCsvUrl(STORES_SHEET_GID), { 
        next: { revalidate: 300 } // 5分間キャッシュ
      }),
      fetchCategoryTags(),
    ]);

    if (!storesResponse.ok) {
      throw new Error(`店舗データの取得に失敗: ${storesResponse.status}`);
    }

    const csvText = await storesResponse.text();
    const rawStores = parseCsv<RawStoreData>(csvText);

    // カテゴリごとにタグをグループ化（高速検索のため）
    const tagsByCategory = new Map<string, TagData[]>();
    for (const tag of allTags) {
      const existing = tagsByCategory.get(tag.category) || [];
      existing.push(tag);
      tagsByCategory.set(tag.category, existing);
    }

    // 店舗データにタグを結合
    const stores: Store[] = rawStores
      .filter((row) => row.id && row.name)
      .map((row) => {
        const category = row.category?.trim() || '';
        const selectableTags = tagsByCategory.get(category) || [];

        return {
          id: row.id.trim(),
          name: row.name.trim(),
          category,
          description: row.description?.trim() || '',
          googleMapsUrl: row.googleMapsUrl?.trim() || '',
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
