/**
 * レビュー生成API（タグ選択ベース）
 * 
 * 選択されたタグに基づいて、事実に即した正直なレビューを生成します。
 * ハルシネーション（選択されていない要素の言及）を禁止。
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// =============================================================================
// 型定義
// =============================================================================

interface GenerateRequest {
    storeName: string;
    storeCategory: string;
    /** 良かった点として選択されたタグ名 */
    goodTags: string[];
    /** 普通・気にならなかった点として選択されたタグ名 */
    normalTags: string[];
    /** イマイチ・改善点として選択されたタグ名 */
    badTags: string[];
    /** ユーザーの性別（任意） */
    userGender?: string;
    /** ユーザーの年代（任意） */
    userAge?: string;
    /** 来店頻度（任意） */
    visitFrequency?: string;
}

// =============================================================================
// OpenAI クライアント
// =============================================================================

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// =============================================================================
// プロンプト生成
// =============================================================================

function buildPrompt(data: GenerateRequest): string {
    // ペルソナ情報
    const personaParts = [
        data.userGender && `性別: ${data.userGender}`,
        data.userAge && `年代: ${data.userAge}`,
        data.visitFrequency && `来店頻度: ${data.visitFrequency}`,
    ].filter(Boolean);
    const persona = personaParts.length > 0 ? personaParts.join('、') : '';

    // 選択されたタグの整理
    const goodTagsStr = data.goodTags.length > 0
        ? data.goodTags.join('、')
        : 'なし';
    const normalTagsStr = data.normalTags.length > 0
        ? data.normalTags.join('、')
        : 'なし';
    const badTagsStr = data.badTags.length > 0
        ? data.badTags.join('、')
        : 'なし';

    return `あなたは${data.storeCategory}を利用した一般のお客様です。以下の【選択されたタグ】に基づいてGoogleマップのレビューを書いてください。

【選択されたタグ】
- 良かった点: ${goodTagsStr}
- 普通の点: ${normalTagsStr}
- イマイチな点: ${badTagsStr}

${persona ? `【あなたのプロフィール】${persona}` : ''}

【絶対に守るルール】
1. **事実限定**: 上記で選択されたタグ以外の要素は絶対に書かない。推測や補完をしない。
2. **固有名詞禁止**: 店名・地名（「金沢の〜」など）を文中に絶対に入れない。「このお店」「ここ」などの指示語を使う。
3. **感想開始**: 「〜に行きました」「初めて訪問」などの導入は書かない。いきなり感想から始める。
4. **構成順序**: [良い点] → [普通の点は必要なら軽く触れる] → [悪い点] の順で自然な文章にする。
   - 良い点がない場合は無理に褒めない
   - 普通の点は省略可
   - 悪い点がある場合は正直に書くが、攻撃的にはならない
5. **自然な話し言葉**: 箇条書き禁止。「〜でした」の連発禁止。友人に話すような口調で。
6. **長さ**: 80〜150文字程度。

レビュー本文のみを出力してください。`;
}

// =============================================================================
// API ハンドラー
// =============================================================================

export async function POST(request: NextRequest) {
    try {
        // APIキーの確認
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'OpenAI APIキーが設定されていません' },
                { status: 500 }
            );
        }

        // リクエストの解析
        const body: GenerateRequest = await request.json();

        // 必須フィールドの検証
        if (!body.storeName) {
            return NextResponse.json(
                { error: '店舗名は必須です' },
                { status: 400 }
            );
        }

        // 少なくとも1つのタグが選択されているか確認
        const totalTags =
            (body.goodTags?.length || 0) +
            (body.normalTags?.length || 0) +
            (body.badTags?.length || 0);

        if (totalTags === 0) {
            return NextResponse.json(
                { error: '少なくとも1つのタグを選択してください' },
                { status: 400 }
            );
        }

        // デフォルト値の設定
        const requestData: GenerateRequest = {
            storeName: body.storeName,
            storeCategory: body.storeCategory || '店舗',
            goodTags: body.goodTags || [],
            normalTags: body.normalTags || [],
            badTags: body.badTags || [],
            userGender: body.userGender,
            userAge: body.userAge,
            visitFrequency: body.visitFrequency,
        };

        // プロンプト生成
        const prompt = buildPrompt(requestData);

        // OpenAI API呼び出し
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'あなたは一般のお客様として、選択されたタグのみに基づいた正直で自然なレビューを書きます。選択されていない要素については一切言及しません。',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: 300,
        });

        const review = completion.choices[0]?.message?.content?.trim() || '';

        return NextResponse.json({ review });
    } catch (error) {
        console.error('レビュー生成エラー:', error);
        return NextResponse.json(
            { error: 'レビューの生成に失敗しました' },
            { status: 500 }
        );
    }
}
