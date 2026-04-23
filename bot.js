require('dotenv').config();
const { Telegraf } = require('telegraf');
const Groq = require('groq-sdk');

const bot = new Telegraf(process.env.BOT_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const userHistory = new Map();

const SYSTEM_PROMPT = `Sen Beluga AI'sın. Samimi bir asistansın. 
Kısa ve öz cevaplar ver. Kullanıcıya 'kral' diye hitap et.`;

bot.start((ctx) => ctx.reply('Selam kral! Beluga hazır ve nazır. 🐋'));

// Fotoğraf Oluşturma (Canvas Kullanmayan En Güvenli Yöntem)
bot.command('foto', async (ctx) => {
    const prompt = ctx.message.text.split(' ').slice(1).join(' ');
    if (!prompt) return ctx.reply('Kral, ne çizelim? Örnek: /foto mavi bir balina');

    try {
        await ctx.sendChatAction('upload_photo');
        // Pollinations URL - nologo=true ile tertemiz görsel alırız
        const photoUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
        
        await ctx.replyWithPhoto(photoUrl, { 
            caption: `Beluga AI Sanat Eseri: "${prompt}" 🎨\n\n(Logo mühürleme sistemi bakımda kral!) 🐋` 
        });
    } catch (e) {
        ctx.reply('Çizim motoru biraz yoruldu, sonra tekrar deneyelim kral.');
    }
});

bot.command('reset', (ctx) => {
    userHistory.delete(ctx.from.id);
    ctx.reply('Hafıza tertemiz oldu kral! 🐋');
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    if (!userHistory.has(userId)) userHistory.set(userId, []);
    const history = userHistory.get(userId);

    try {
        await ctx.sendChatAction('typing');
        history.push({ role: "user", content: ctx.message.text });

        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history.slice(-6)],
            model: "llama-3.3-70b-versatile", // En stabil model
            temperature: 0.7,
        });

        let res = completion.choices[0].message.content.replace(/<(think|thought)>[\s\S]*?<\/\1>/gi, '').trim();
        history.push({ role: "assistant", content: res });
        
        if (history.length > 12) history.splice(0, 2);
        await ctx.reply(res);
    } catch (err) {
        console.error(err);
        ctx.reply('Ufak bir takılma oldu, /reset yazıp devam edelim mi?');
    }
});

bot.launch().then(() => console.log("Beluga Online! 🐋"));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
