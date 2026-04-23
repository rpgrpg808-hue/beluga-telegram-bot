require('dotenv').config();
const { Telegraf } = require('telegraf');
const Groq = require('groq-sdk');

const bot = new Telegraf(process.env.BOT_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Kullanıcı bazlı hafıza
const userHistory = new Map();

const SYSTEM_PROMPT = `Sen Beluga AI'sın. Türkçe konuşan samimi bir asistansın.
Kurallar: En fazla 2-4 cümle yaz. Kısa ve net ol.
Emoji kullan ama abartma. Kullanıcıya 'kral' diye hitap edebilirsin.
Düşünme adımlarını asla yazma, direkt cevabı ver. Sadece Türkçe konuş.`;

bot.start((ctx) => ctx.reply('Selam kral! Ben Beluga 🐋\nSohbet için direkt yazabilirsin.'));

// Hafıza sıfırlama komutu
bot.command('reset', (ctx) => {
    userHistory.delete(ctx.from.id);
    ctx.reply('Hafıza sıfırlandı kral, temiz bir sayfa açtık! 🐋');
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const userMessage = ctx.message.text;

    if (!userHistory.has(userId)) {
        userHistory.set(userId, []);
    }
    const history = userHistory.get(userId);

    try {
        await ctx.sendChatAction('typing');

        history.push({ role: "user", content: userMessage });

        // Kesin çalışan Llama 3.3 70B modeli
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...history.slice(-8)
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.6,
            max_tokens: 800,
        });

        let aiResponse = completion.choices[0].message.content;

        // Her ihtimale karşı etiket temizliği
        aiResponse = aiResponse.replace(/<(think|thought|reasoning)>[\s\S]*?<\/\1>/gi, '');
        aiResponse = aiResponse.replace(/<(think|thought|reasoning)>[\s\S]*/gi, '');
        aiResponse = aiResponse.trim();

        if (aiResponse) {
            history.push({ role: "assistant", content: aiResponse });
            
            if (history.length > 20) {
                history.splice(0, 2);
            }

            await ctx.reply(aiResponse);
        }
    } catch (error) {
        console.error("HATA DETAYI:", error.message);
        
        if (error.message.includes("429")) {
            await ctx.reply("Çok hızlısın kral, limitler zorlanıyor. Biraz bekle düzelecek! 🐋");
        } else {
            await ctx.reply("Ufak bir teknik aksaklık oldu kral, /reset yazıp tekrar deneyelim mi?");
        }
    }
});

// Railway'deki çakışmaları (409) önlemek için botu güvenli başlatma
bot.launch().then(() => console.log("Beluga AI (Llama 3.3 Edition) başarıyla başlatıldı! 🐋🚀"))
    .catch((err) => {
        if (err.message.includes('409')) {
            console.log("Bot zaten başka bir yerde açık (409 Conflict).");
        } else {
            console.error("Bot başlatılamadı:", err);
        }
    });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
