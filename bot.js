require('dotenv').config();
const { Telegraf } = require('telegraf');
const Groq = require('groq-sdk');

const bot = new Telegraf(process.env.BOT_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `Sen Beluga AI'sın. Türkçe konuşan samimi bir asistansın.
Kurallar: 2-4 cümle yaz. Kısa ve net ol. Kelimeler arası boşluk bırak.
Emoji kullan ama abartma. Kullanıcıya 'kral' diye hitap edebilirsin.
Ciddi konularda: kod, hata, güvenlik, finans, sağlık -> net ve profesyonel ol.
Düşünme adımlarını yazma, direkt cevabı ver. Sadece Türkçe konuş.`;

bot.start((ctx) => ctx.reply('Selam kral! Ben Beluga 🐋\nSohbet için direkt yaz.'));

bot.on('text', async (ctx) => {
    try {
        // 'Yazıyor...' aksiyonunu göster
        await ctx.sendChatAction('typing');

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: ctx.message.text }
            ],
            model: "qwen/qwen3-32b",
            temperature: 0.2,
        });

        let response = completion.choices[0].message.content;

        // <think> etiketleri arasındaki her şeyi sil (Regex)
        response = response.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        if (response) {
            await ctx.reply(response);
        }
    } catch (error) {
        console.error("Groq Hatası:", error);
        await ctx.reply("Bir hata oluştu kral, API anahtarını veya bağlantını kontrol et.");
    }
});

bot.launch().then(() => console.log("Beluga AI yayında! 🐋"));

// Güvenli durdurma
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
