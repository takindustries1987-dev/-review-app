/**
 * デバッグ用API - 環境変数と店舗データの確認
 */

import { NextResponse } from 'next/server';
import { fetchStores, getSheetUrl } from '@/lib/store-data';
import Papa from 'papaparse';

const TEST_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSnffrfQMVoVjzQ0sLQjNDfiL1RdgUW2XmYoxcdl7amDUZnRnG87bLTkWu0DCpsO-_u2E6Y2j9xV3m7/pub?output=csv';

interface RawStoreDebug {
    '店舗ID': string;
    '店名・会社名': string;
    '業態': string;
}

export async function GET() {
    try {
        const envVars = {
            SHEET_URL: process.env.NEXT_PUBLIC_SHEET_URL ? 'SET' : 'NOT SET',
            SHEET_URL_VALUE: process.env.NEXT_PUBLIC_SHEET_URL?.substring(0, 50) + '...',
            getSheetUrlResult: getSheetUrl().substring(0, 80) + '...',
        };

        // 直接CSV取得・PapaParseでパース（fetchStoresと同様）
        let directTest = null;
        try {
            const resp = await fetch(TEST_URL, { redirect: 'follow' });
            const text = await resp.text();

            const parsed = Papa.parse<RawStoreDebug>(text, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header) => header.trim(),
            });

            // fetchStoresと同じフィルタリングロジック
            const filtered = parsed.data.filter((row) => row['店舗ID'] && row['店名・会社名']);

            directTest = {
                rawDataCount: parsed.data.length,
                filteredCount: filtered.length,
                firstRaw: parsed.data[0],
                firstFiltered: filtered[0],
                hasStoreId: !!parsed.data[0]?.['店舗ID'],
                hasStoreName: !!parsed.data[0]?.['店名・会社名'],
            };
        } catch (e) {
            directTest = { error: String(e) };
        }

        // 実際のfetchStores呼び出し
        let stores: { id: string }[] = [];
        let fetchError = null;
        try {
            stores = await fetchStores();
        } catch (e) {
            fetchError = String(e);
        }

        return NextResponse.json({
            envVars,
            directTest,
            storeCount: stores.length,
            storeIds: stores.map(s => s.id),
            fetchError,
        });
    } catch (error) {
        return NextResponse.json({
            error: String(error),
        }, { status: 500 });
    }
}
