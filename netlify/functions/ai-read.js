exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'APIキーが設定されていません。' } }) };
  }
  try {
    const { fileData, mimeType, isPDF } = JSON.parse(event.body);
    const headers = {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    };
    if (isPDF) headers['anthropic-beta'] = 'pdfs-2024-09-25';
    const contentBlock = isPDF
      ? { type:'document', source:{ type:'base64', media_type:'application/pdf', data:fileData } }
      : { type:'image', source:{ type:'base64', media_type:mimeType, data:fileData } };
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers,
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role:'user', content:[contentBlock, { type:'text', text:'この見積書から以下の情報をJSON形式で抽出してください。\n{\n  "companyName": "会社名",\n  "items": [\n    { "name": "品名", "quantity": 数量(数値), "unitPrice": 単価(数値) }\n  ],\n  "notes": "備考"\n}\n数値は円記号やカンマを除いた数値のみ。JSONのみ返してください。' }] }]
      })
    });
    const data = await res.json();
    return { statusCode: res.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: e.message } }) };
  }
};
