require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const Groq = require('groq-sdk');
const express = require('express');

const bot = new Telegraf(process.env.BOT_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

bot.use(session());
const userHistory = new Map();

const SYSTEM_PROMPT = `Sen Beluga AI'sın. Samimi bir asistansın. Cevapların kısa olsun (en fazla 2 cümle). Kullanıcıya her zaman 'kral' diye hitap et.`;

bot.start((ctx) => ctx.reply('Selam Emir Ali! Beluga yazılı olarak hizmetinde! 🐋\n\n- /foto [kelime] ile resim çizerim.\n- Sohbet edebiliriz.'));

bot.command('foto', async (ctx) => {
    const prompt = ctx.message.text.split(' ').slice(1).join(' ');
    if (!prompt) return ctx.reply('Kral, ne çizelim?');
    const photoUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
    await ctx.replyWithPhoto(photoUrl, { caption: '🎨 Beluga Özel Üretim 🐋' });
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    if (!userHistory.has(userId)) userHistory.set(userId, []);
    const history = userHistory.get(userId);

    try {
        await ctx.sendChatAction('typing');
        history.push({ role: "user", content: ctx.message.text });
        
        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history.slice(-4)],
            model: "llama-3.3-70b-versatile",
        });

        let res = completion.choices[0].message.content.trim();
        history.push({ role: "assistant", content: res });
        await ctx.reply(res);
    } catch (err) { 
        console.error("Hata:", err);
        ctx.reply('Bir takılma oldu kral, tekrar yazar mısın?'); 
    }
});

const app = express();
app.get('/', (req, res) => res.send('Beluga AI Online! 🐋'));
app.listen(process.env.PORT || 3000);

bot.launch().then(() => console.log("Beluga yazılı olarak yayında! 🚀"));
