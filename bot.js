require('dotenv').config();
const { Telegraf } = require('telegraf');
const Groq = require('groq-sdk');
const axios = require('axios');
const { createCanvas, loadImage } = require('canvas');

const bot = new Telegraf(process.env.BOT_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Kullanıcı bazlı hafıza
const userHistory = new Map();

const SYSTEM_PROMPT = `Sen Beluga AI'sın. Türkçe konuşan samimi bir asistansın.
Kurallar: En fazla 2-4 cümle yaz. Kısa ve net ol.
Emoji kullan ama abartma. Kullanıcıya 'kral' diye hitap edebilirsin.
Düşünme adımlarını asla yazma, direkt cevabı ver. Sadece Türkçe konuş.`;

// Mühürleme (Watermark) Fonksiyonu
async function watermarkedImage(pollinationsUrl) {
    try {
        // 1. Pollinations'tan görseli indir
        const imageResponse = await axios.get(pollinationsUrl, { responseType: 'arraybuffer' });
        const originalImage = await loadImage(imageResponse.data);

        // 2. Canvas oluştur
        const canvas = createCanvas(originalImage.width, originalImage.height);
        const ctx = canvas.getContext('2d');

        // 3. Orijinal görseli çiz
        ctx.drawImage(originalImage, 0, 0);

        // 4. Senin logonun PNG halini yükle
        const logoImage = await loadImage('https://i.imgur.com/qHkqhlM.png'); 

        // 5. Logo boyutu (Görselin %15'i kadar) ve konumu (Sağ Alt)
        const logoWidth = originalImage.width * 0.15;
        const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
        const xPos = originalImage.width - logoWidth - 30;
        const yPos = originalImage.height - logoHeight - 30;

        // 6. Logoyu çiz
        ctx.drawImage(logoImage, xPos, yPos, logoWidth, logoHeight);

        return canvas.toBuffer('image/png');
    } catch (err) {
        console.error("Mühürleme hatası:", err);
        return null;
    }
}

bot.start((ctx) => ctx.reply('Selam kral! Ben Beluga 🐋\nSohbet için yazabilir, fotoğraf için /foto komutunu kullanabilirsin.'));

bot.command('reset', (ctx) => {
    userHistory.delete(ctx.from.id);
    ctx.reply('Hafıza sıfırlandı kral, temiz bir sayfa açtık! 🐋');
});

// Fotoğraf Oluşturma Komutu
bot.command('foto', async (ctx) => {
    const prompt = ctx.message.text.split(' ').slice(1).join(' ');
    
    if (!prompt) {
        return ctx.reply('Kral, ne çizmemi istersin? Örnek: /foto karda oynayan beluga');
    }

    try {
        await ctx.sendChatAction('upload_photo');
        
        // Pollinations URL (nologo=true diyerek onların logosunu kaldırıyoruz)
        const pollinationsUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
        
        const imageBuffer = await watermarkedImage(pollinationsUrl);

        if (imageBuffer) {
            await ctx.replyWithPhoto({ source: imageBuffer }, { caption: `Beluga AI Özel Üretim: "${prompt}" 🎨🐋` });
        } else {
            // Mühürleme başarısız olursa orijinali gönder
            await ctx.replyWithPhoto(pollinationsUrl, { caption: `Mühürlenemedi ama çizdim: "${prompt}"` });
        }
    } catch (error) {
        ctx.reply('Şu an çizim yapamıyorum kral, fırçalarım kurumuş. 😔');
    }
});

// Normal Sohbet Akışı
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const userMessage = ctx.message.text;

    if (!userHistory.has(userId)) userHistory.set(userId, []);
    const history = userHistory.get(userId);

    try {
        await ctx.sendChatAction('typing');
        history.push({ role: "user", content: userMessage });

        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history.slice(-8)],
            model: "llama-3.3-70b-versatile",
            temperature: 0.6,
            max_tokens: 512,
        });

        let aiResponse = completion.choices[0].message.content;
        aiResponse = aiResponse.replace(/<(think|thought|reasoning)>[\s\S]*?<\/\1>/gi, '').trim();

        if (aiResponse) {
            history.push({ role: "assistant", content: aiResponse });
            if (history.length > 16) history.splice(0, 2);
            await ctx.reply(aiResponse);
        }
    } catch (error) {
        console.error("Hata:", error.message);
        ctx.reply("Ufak bir sorun çıktı kral, /reset yazıp düzeltebilirsin.");
    }
});

bot.launch().then(() => console.log("Beluga AI (Llama 3.3 + Photo Mode) Aktif! 🐋🚀"));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
