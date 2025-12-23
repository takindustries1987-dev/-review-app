import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Vercel Hobbyプラン対策 (30秒以上の処理を許容設定)
export const maxDuration = 30;

// OpenAIクライアントは遅延初期化（ビルド時にAPIキーがなくてもエラーにならないようにする）
function getOpenAIClient(): OpenAI {
    return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

// リクエストの型定義
interface GenerateRequest {
    storeId?: string;
    storeName: string;
    storeCategory: string;
    goodTags: string[];
    normalTags: string[];
    badTags: string[];
    userGender?: string;
    userAge?: string;
    visitFrequency?: string;
    language?: 'ja' | 'en' | 'zh-CN' | 'zh-TW' | 'ko';
}

export async function POST(request: Request) {
    try {
        const body: GenerateRequest = await request.json();
        console.log('[API] Request body:', JSON.stringify(body));

        // 1. 店舗名の確保（フロントからstoreNameが来なくても、storeIdをフォールバックとして使用）
        let safeStoreName = body.storeName;

        // もしstoreNameが空なら、storeIdを使用
        if (!safeStoreName || safeStoreName.trim() === '') {
            if (body.storeId && body.storeId.trim() !== '') {
                safeStoreName = body.storeId;
            } else {
                safeStoreName = 'Unknown Store';
            }
        }

        console.log(`[API] Generating review for: ${safeStoreName} (storeId: ${body.storeId || 'N/A'})`);

        // --- プロンプト構築ロジック ---
        const {
            storeCategory, goodTags, normalTags, badTags,
            userGender, userAge, visitFrequency, language = 'ja'
        } = body;

        // === 書き手タイプの重み付きランダム選択 ===
        // Short: 40%, Casual: 40%, Detailed: 20%
        type WriterType = 'Short' | 'Casual' | 'Detailed';
        const rand = Math.random();
        let writerType: WriterType;
        if (rand < 0.4) {
            writerType = 'Short';
        } else if (rand < 0.8) {
            writerType = 'Casual';
        } else {
            writerType = 'Detailed';
        }
        console.log(`[API] Writer type selected: ${writerType}`);

        // === 多言語対応システムプロンプト ===
        let systemPrompt = '';

        // 日本語プロンプト
        if (language === 'ja') {
            const basePrompt = `あなたはGoogleマップに口コミを投稿する一般人です。
店舗カテゴリ: ${storeCategory || '店舗'}

【絶対禁止事項】
1. ポエム禁止: 「味のダンス」「口の中で広がる宇宙」「魔法のような」「シンフォニー」「マリアージュ」「宝石箱」などの大げさな比喩は絶対禁止
2. AI構文禁止: 「全体的に〜」「〜と言えるでしょう」「総括すると」などのまとめ言葉禁止
3. タグのオウム返し禁止: 「コスパ」「接客」「独創性」などの選択タグをそのまま使わず、具体的な状況や体験を描写すること
4. 店名・地名禁止: 「このお店」「ここ」を使う
5. 導入禁止: 「〜に行きました」「初めて訪問」などから始めない。いきなり感想から

【共通ルール】
- 嘘のエピソードは捏造しない（選択されたタグの内容のみ言及）
- 自然な日本語で書く
- 箇条書き禁止`;

            if (writerType === 'Short') {
                systemPrompt = basePrompt + `

【今回のスタイル: 短文・塩対応】
- ぶっきらぼうに、一言二言で終わる
- 形容詞をほとんど使わない
- 感情を込めすぎない。淡々と事実だけ
- 長さ: 30〜60文字以内（厳守）
- 例: 「料理の提供早かった。ワインも良かった。」「雰囲気は普通。でもまた来る。」`;
            } else if (writerType === 'Casual') {
                systemPrompt = basePrompt + `

【今回のスタイル: 一般・口語（友達にLINE送る感じ）】
- 「〜かも」「〜な感じ」「〜だったな〜」などの砕けた語尾OK
- 少し緩めのテンション
- 長さ: 80〜120文字程度
- 例: 「ペアリングお願いしたんだけど、これが正解だった！雰囲気も落ち着いてて、ゆっくりできたかも。」`;
            } else {
                systemPrompt = basePrompt + `

【今回のスタイル: 丁寧・具体的】
- 真面目にレビューを書く人
- 詩的な表現は禁止。具体的に書く
- 「〜でした」「〜と思います」の丁寧語
- 長さ: 120〜150文字程度
- 例: 「前菜からデザートまで、一皿一皿の完成度が高かったです。特にメインの火入れが絶妙で、好みの仕上がりでした。」`;
            }
        } else if (language === 'en') {
            const basePrompt = `You are a regular person writing a Google Maps review.
Store Category: ${storeCategory || 'establishment'}

【Strictly Forbidden】
1. No poetic metaphors: "dance of flavors", "symphony", "magic", "culinary journey" - absolutely banned
2. No AI phrases: "Overall", "In conclusion", "All in all"
3. No tag echoing: Don't use the exact tag words. Describe the experience instead.
4. No store names (use "this place", "here")
5. No introductions like "I visited..."`;

            if (writerType === 'Short') {
                systemPrompt = basePrompt + `

【Style: Short & Blunt】
- 1-2 short sentences max
- Almost no adjectives
- Flat, matter-of-fact tone
- Length: 20-40 words max
- Example: "Food came out fast. Wine was good. Would go again."`;
            } else if (writerType === 'Casual') {
                systemPrompt = basePrompt + `

【Style: Casual (texting a friend)】
- Conversational, relaxed tone
- Can use "kinda", "pretty", "tbh"
- Length: 40-80 words
- Example: "Got the wine pairing and honestly it was perfect. Chill vibes too, not too loud."`;
            } else {
                systemPrompt = basePrompt + `

【Style: Detailed & Grounded】
- Helpful, informative review
- No flowery language - be specific
- Length: 80-120 words
- Example: "The main course was cooked perfectly - medium rare as requested. Service was attentive without being intrusive."`;
            }
        } else if (language === 'zh-CN') {
            const basePrompt = `你是一个普通人，正在为Google地图写评价。
店铺类别: ${storeCategory || '店铺'}

【绝对禁止】
1. 禁止诗意表达："味道的舞蹈"、"魔法般的"、"味蕾的交响乐"等
2. 禁止AI套话："总体来说"、"综上所述"
3. 禁止复读标签词：不要直接使用标签词，要描述具体体验
4. 不要提店名（用"这家店"、"这里"）
5. 不要用"我去了..."开头`;

            if (writerType === 'Short') {
                systemPrompt = basePrompt + `

【风格：简短直接】
- 一两句话搞定
- 少用形容词
- 长度：20-40字
- 例："菜上得快，酒也不错。"`;
            } else if (writerType === 'Casual') {
                systemPrompt = basePrompt + `

【风格：口语随意】
- 像跟朋友聊天一样
- 长度：50-80字`;
            } else {
                systemPrompt = basePrompt + `

【风格：认真具体】
- 写有用的评价
- 不要诗意，要具体
- 长度：80-100字`;
            }
        } else if (language === 'zh-TW') {
            const basePrompt = `你是一個普通人，正在為Google地圖寫評價。
店鋪類別: ${storeCategory || '店鋪'}

【絕對禁止】
1. 禁止詩意表達
2. 禁止AI套話
3. 禁止複讀標籤詞
4. 不要提店名
5. 不要用「我去了...」開頭`;

            if (writerType === 'Short') {
                systemPrompt = basePrompt + `\n\n【風格：簡短直接】一兩句話，20-40字`;
            } else if (writerType === 'Casual') {
                systemPrompt = basePrompt + `\n\n【風格：口語隨意】像跟朋友聊天，50-80字`;
            } else {
                systemPrompt = basePrompt + `\n\n【風格：認真具體】有用的評價，不要詩意，80-100字`;
            }
        } else if (language === 'ko') {
            const basePrompt = `당신은 Google 지도에 리뷰를 쓰는 일반인입니다.
매장 카테고리: ${storeCategory || '매장'}

【절대 금지】
1. 시적 표현 금지: "맛의 춤", "마법 같은" 등
2. AI 상투어 금지: "전반적으로", "결론적으로"
3. 태그 단어 직접 사용 금지
4. 매장명 언급 금지
5. "방문했습니다..." 시작 금지`;

            if (writerType === 'Short') {
                systemPrompt = basePrompt + `\n\n【스타일: 짧고 직설적】한두 문장, 20-40자`;
            } else if (writerType === 'Casual') {
                systemPrompt = basePrompt + `\n\n【스타일: 친구에게 카톡하듯】편하게, 50-80자`;
            } else {
                systemPrompt = basePrompt + `\n\n【스타일: 진지하고 구체적】도움되는 리뷰, 80-100자`;
            }
        }

        // ペルソナ設定
        if (userGender || userAge) {
            systemPrompt += `\n\nペルソナ: ${userAge || ''} ${userGender || ''}`;
        }
        if (visitFrequency) {
            systemPrompt += `\n来店頻度: ${visitFrequency}`;
            if (visitFrequency === '初めて') systemPrompt += "（第一印象を重視）";
            if (visitFrequency === '常連') systemPrompt += "（馴染みの安心感を表現）";
        }

        // ユーザープロンプト（タグを「種」として提示）
        let userPrompt = language === 'ja'
            ? `以下のタグを「種」として、豊かな表現で体験を描写するレビューを書いてください。タグの言葉をそのまま使わず、その本質を別の言葉で表現してください。\n\n`
            : `Write a review using the following tags as "seeds". Express the essence of each tag using rich, different words - never use the tag words directly.\n\n`;
        if (goodTags && goodTags.length > 0) userPrompt += `【良かった点】: ${goodTags.join(', ')}\n`;
        if (normalTags && normalTags.length > 0) userPrompt += `【普通だった点】: ${normalTags.join(', ')}\n`;
        if (badTags && badTags.length > 0) userPrompt += `【気になった点】: ${badTags.join(', ')}\n`;

        // --- OpenAI API 実行 ---
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            max_tokens: 500,
            temperature: 0.8,
        });

        const review = completion.choices[0]?.message?.content?.trim() || '';
        console.log('[API] Review generated:', review.substring(0, 50) + '...');

        // --- ログデータの収集 ---
        // usageが存在しない場合は文字数でフォールバック
        let tokenCount = completion.usage?.total_tokens || 0;
        if (tokenCount === 0 && review.length > 0) {
            // トークン数が取得できない場合、文字数の1.5倍で概算
            tokenCount = Math.ceil(review.length * 1.5);
            console.log(`[API] tokenCount was 0, using fallback: ${tokenCount}`);
        }
        const estimatedCost = Math.round((tokenCount * 0.0003) * 100) / 100;
        console.log(`[API] Tokens: ${tokenCount}, Cost: ¥${estimatedCost}`);

        // --- 送信データの検証 ---
        const finalStoreName = safeStoreName || 'UNKNOWN_STORE';
        const finalTokenCount = tokenCount || 1; // 0は絶対に送らない
        console.log(`[API] Final values - storeName: "${finalStoreName}", tokenCount: ${finalTokenCount}`);

        // --- GASへの送信 (awaitで確実に送信完了を待つ) ---
        const gasUrl = process.env.USAGE_LOG_WEBHOOK_URL;
        if (gasUrl) {
            const logPayload = {
                timestamp: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
                storeName: finalStoreName,
                language: language,
                cost: estimatedCost,
                tokenCount: finalTokenCount
            };

            console.log("[API] Sending log to GAS (awaiting):", JSON.stringify(logPayload));

            try {
                // ★ awaitで送信完了を待機。Content-Typeはtext/plainでGASがリダイレクトなしで処理できるようにする
                const gasResponse = await fetch(gasUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify(logPayload),
                    redirect: 'follow'
                });

                console.log("[API] GAS Response status:", gasResponse.status);
                // レスポンスボディも確認
                const responseText = await gasResponse.text();
                console.log("[API] GAS Response body:", responseText.substring(0, 200));
            } catch (err) {
                console.error("[API] GAS Send Error:", err);
            }
        } else {
            console.warn('[API] USAGE_LOG_WEBHOOK_URL not configured');
        }

        return NextResponse.json({
            review,
            meta: {
                tone: writerType,
                language: language,
                tokenCount: tokenCount,
                cost: estimatedCost
            }
        });

    } catch (error: unknown) {
        console.error('[API] Error:', error);
        const message = error instanceof Error ? error.message : 'レビューの生成に失敗しました';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
