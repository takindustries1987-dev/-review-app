/**
 * 店舗データ取得API
 * 
 * URLパラメータで指定されたIDの店舗データを返す
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchStoreById } from '@/lib/store-data';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const storeId = searchParams.get('id');

        if (!storeId) {
            return NextResponse.json(
                { error: '店舗IDが必要です' },
                { status: 400 }
            );
        }

        const store = await fetchStoreById(storeId);

        if (!store) {
            return NextResponse.json(
                { error: '指定された店舗が見つかりません' },
                { status: 404 }
            );
        }

        return NextResponse.json({ store });
    } catch (error) {
        console.error('店舗データ取得エラー:', error);
        return NextResponse.json(
            { error: '店舗データの取得に失敗しました' },
            { status: 500 }
        );
    }
}
