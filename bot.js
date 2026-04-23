require('dotenv').config();
const { Telegraf } = require('telegraf');
const Groq = require('groq-sdk');

const bot = new Telegraf(process.env.BOT_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Kullanıcı bazlı hafıza
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

    if (!userHistory.has(userId)) {
        userHistory.set(userId, []);
    }
    const history = userHistory.get(userId);

    try {
        await ctx.sendChatAction('typing');

        history.push({ role: "user", content: userMessage });

        const messagesToSend = [
            { role: "system", content: SYSTEM_PROMPT },
            ...history.slice(-8)
        ];

        const completion = await groq.chat.completions.create({
            messages: messagesToSend,
            model: "qwen/qwen3-32b",
            temperature: 0.6, // Döngüye girmemesi için biraz yükselttik
            max_tokens: 1000, // API'nin şişmesini engellemek için sınır koyduk
        });

        let aiResponse = completion.choices[0].message.content;

        // <think> etiketlerini ve içindekileri temizle
        aiResponse = aiResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        if (aiResponse) {
            history.push({ role: "assistant", content: aiResponse });
            
            if (history.length > 20) {
                history.splice(0, 2);
            }

            await ctx.reply(aiResponse);
        }
    } catch (error) {
        // Hatayı terminalde detaylı görmek için:
        console.error("DETAYLI HATA:", error.message);
        
        if (error.message.includes("rate_limit")) {
            await ctx.reply("Çok hızlısın kral, biraz bekle limit doldu. 🐋");
        } else {
            await ctx.reply("Bir hata oluştu kral, hafızayı /reset ile sıfırlayıp tekrar dene.");
        }
    }
});

bot.launch().then(() => console.log("Beluga AI (Hafızalı & Optimize) yayında! 🐋"));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
