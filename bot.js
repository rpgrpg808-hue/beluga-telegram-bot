require('dotenv').config();
const { Telegraf } = require('telegraf');
const Groq = require('groq-sdk');

const bot = new Telegraf(process.env.BOT_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Kullanıcı bazlı hafıza Map'i
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

        // Kullanıcı mesajını hafızaya ekle
        history.push({ role: "user", content: userMessage });

        // Groq Maverick modeline istek at
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...history.slice(-8) // Son 8 mesajı gönder
            ],
            model: "llama-4-maverick-17b-128e-instruct", 
            temperature: 0.7,
            max_tokens: 1024,
        });

        let aiResponse = completion.choices[0].message.content;

        // Her ihtimale karşı temizlik (Maverick'te pek gerekmez ama sağlam olsun)
        aiResponse = aiResponse.replace(/<(think|thought|reasoning)>[\s\S]*?<\/\1>/gi, '');
        aiResponse = aiResponse.replace(/<(think|thought|reasoning)>[\s\S]*/gi, '');
        aiResponse = aiResponse.trim();

        if (aiResponse) {
            // Asistan cevabını hafızaya ekle
            history.push({ role: "assistant", content: aiResponse });
            
            // 20 mesajı geçerse en eski ikiliyi sil
            if (history.length > 20) {
                history.splice(0, 2);
            }

            await ctx.reply(aiResponse);
        }
    } catch (error) {
        console.error("HATA:", error.message);
        
        if (error.message.includes("429")) {
            await ctx.reply("Çok hızlısın kral, Maverick bile yetişemedi! Biraz bekle. 🐋");
        } else {
            await ctx.reply("Bir hata oldu kral, /reset yazıp temiz bir sayfa açalım mı?");
        }
    }
});

bot.launch().then(() => console.log("Beluga AI (Maverick Edition) yayında! 🐋🚀"));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
