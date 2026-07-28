const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Sen bir alışveriş fişi/fatura analiz uzmanısın. Sana verilen görsel veya PDF bir alışveriş fişi/fatura.
Fişteki HER KALEMİ ayrı ayrı çıkar. Sadece geçerli JSON döndür, başka hiçbir şey yazma.

Format:
{
  "merchant": "Mağaza adı (ör: BİM, Migros, Şok)",
  "date": "YYYY-MM-DD formatında tarih (bulamazsan bugünün tarihi)",
  "category": "food | shopping | utilities | transport | health | entertainment | education | children | clothing | rent | other",
  "total": 123.45,
  "currency": "TRY",
  "items": [
    { "description": "Ürün adı", "quantity": 1, "unit_price": 10.5, "total": 10.5 }
  ]
}

Kurallar:
- Her satır ürün ayrı bir item olmalı (5 adet su = 1 item, quantity=5)
- Fiyatları sayı olarak ver (virgül yerine nokta)
- Marketse category="food", giyim mağazasıysa "clothing", elektrik/su/doğalgaz faturasıysa "utilities" vb.
- KDV/toplam/ara toplam gibi satırları items'a ekleme
- Sadece JSON döndür, markdown code block kullanma.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileData, mimeType, fileName } = await req.json();
    if (!fileData || !mimeType) {
      return new Response(JSON.stringify({ error: "fileData ve mimeType gerekli" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const dataUrl = fileData.startsWith("data:") ? fileData : `data:${mimeType};base64,${fileData}`;

    let userContent: any[];
    if (mimeType.startsWith("image/")) {
      userContent = [
        { type: "text", text: "Bu alışveriş fişini analiz et ve JSON döndür." },
        { type: "image_url", image_url: { url: dataUrl } },
      ];
    } else if (mimeType === "application/pdf") {
      userContent = [
        { type: "text", text: "Bu PDF alışveriş fişini/faturayı analiz et ve JSON döndür." },
        {
          type: "file",
          file: {
            filename: fileName || "receipt.pdf",
            file_data: dataUrl,
          },
        },
      ];
    } else {
      return new Response(JSON.stringify({ error: "Desteklenmeyen dosya tipi: " + mimeType }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Çok fazla istek. Lütfen biraz sonra tekrar deneyin." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI kredisi tükendi. Lütfen kontrol edin." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      throw new Error(`AI Gateway error: ${response.status} ${t}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { items: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("scan-receipt error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
