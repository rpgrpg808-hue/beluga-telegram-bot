require('dotenv').config();
const { Telegraf } = require('telegraf');
const Groq = require('groq-sdk');

const bot = new Telegraf(process.env.BOT_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Kullanıcı bazlı hafıza için Map
const userHistory = new Map();

const SYSTEM_PROMPT = `Sen Beluga AI'sın. Türkçe konuşan samimi bir asistansın.
Kurallar: 2-4 cümle yaz. Kısa ve net ol. Kelimeler arası boşluk bırak.
Emoji kullan ama abartma. Kullanıcıya 'kral' diye hitap edebilirsin.
Ciddi konularda: kod, hata, güvenlik, finans, sağlık -> net ve profesyonel ol.
Düşünme adımlarını yazma, direkt cevabı ver. Sadece Türkçe konuş.`;

bot.start((ctx) => ctx.reply('Selam kral! Ben Beluga 🐋\nSohbet için direkt yaz.'));

// Hafıza sıfırlama komutu
bot.command('reset', (ctx) => {
    userHistory.delete(ctx.from.id);
    ctx.reply('Hafıza sıfırlandı kral 🐋');
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const userMessage = ctx.message.text;

    // Kullanıcının geçmişini al veya yeni oluştur
    if (!userHistory.has(userId)) {
        userHistory.set(userId, []);
    }
    const history = userHistory.get(userId);

    try {
        await ctx.sendChatAction('typing');

        // Mevcut mesajı geçmişe ekle
        history.push({ role: "user", content: userMessage });

        // Groq'a gönderilecek mesaj listesini hazırla (Sistem + Son 8 mesaj)
        const messagesToSend = [
            { role: "system", content: SYSTEM_PROMPT },
            ...history.slice(-8)
        ];

        const completion = await groq.chat.completions.create({
            messages: messagesToSend,
            model: "qwen/qwen3-32b",
            temperature: 0.2,
        });

        let aiResponse = completion.choices[0].message.content;

        // <think> etiketlerini temizle
        aiResponse = aiResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        if (aiResponse) {
            // Asistan cevabını geçmişe ekle
            history.push({ role: "assistant", content: aiResponse });
            
            // 20 mesaj limit kontrolü: Geçerse en eski 2 mesajı sil
            if (history.length > 20) {
                history.splice(0, 2);
            }

            await ctx.reply(aiResponse);
        }
    } catch (error) {
        console.error("Groq Hatası:", error);
        await ctx.reply("Bir hata oluştu kral, hafıza sistemi veya API şu an yoğun olabilir.");
    }
});

bot.launch().then(() => console.log("Beluga AI (Hafızalı) yayında! 🐋"));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
