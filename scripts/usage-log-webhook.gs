/**
 * Usage Logs Webhook for Review App
 * 
 * このスクリプトをGoogle Apps Scriptにデプロイして、
 * レビュー生成の利用ログをスプレッドシートに記録します。
 * 
 * 【セットアップ手順】
 * 1. スプレッドシートの「拡張機能 > Apps Script」を開く
 * 2. このコードを貼り付けて保存
 * 3. 「デプロイ > 新しいデプロイ」を選択
 * 4. 種類: 「ウェブアプリ」
 * 5. 次のユーザーとして実行: 「自分」
 * 6. アクセスできるユーザー: 「全員」
 * 7. デプロイして、表示されるURLをコピー
 * 8. 環境変数 USAGE_LOG_WEBHOOK_URL にそのURLを設定
 */

// シート名（必要に応じて変更）
const SHEET_NAME = 'UsageLogs';

/**
 * POSTリクエストを処理
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    const sheet = getOrCreateSheet();
    
    // 新しい行を追加
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.storeId || '',
      data.language || '',
      data.tokenEstimate || 0
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GETリクエストを処理（テスト用）
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ 
      status: 'ok', 
      message: 'Usage Log Webhook is running' 
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * シートを取得または作成
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    // シートがなければ作成
    sheet = ss.insertSheet(SHEET_NAME);
    // ヘッダー行を追加
    sheet.appendRow(['Timestamp', 'StoreID', 'Language', 'TokenEstimate']);
    // ヘッダー行を太字に
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }
  
  return sheet;
}
